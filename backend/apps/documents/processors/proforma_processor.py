import pdfplumber
import docx
import re
import json
from typing import Dict, List, Optional
from openai import OpenAI
from django.conf import settings


class ProformaProcessor:
    def __init__(self):
        self.openai_client = None
        if hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    def extract_data(self, file_path: str) -> Dict:
        try:
            text = self._extract_text(file_path)
            if not text:
                return {"error": "Could not extract text from document"}
            
            if self.openai_client:
                ai_data = self._extract_with_ai(text)
                if ai_data and not ai_data.get('error'):
                    return ai_data
            
            return self._extract_with_rules(text)
            
        except Exception as e:
            return {"error": f"Extraction failed: {str(e)}"}
    
    def _extract_text(self, file_path: str) -> str:
        file_extension = file_path.lower().split('.')[-1]
        
        if file_extension == 'pdf':
            return self._extract_from_pdf(file_path)
        elif file_extension in ['doc', 'docx']:
            return self._extract_from_word(file_path)
        elif file_extension == 'txt':
            return self._extract_from_text(file_path)
        else:
            return ""
    
    def _extract_from_text(self, file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            print(f"Text file reading error: {e}")
            return ""
        
    def _extract_from_pdf(self, file_path: str) -> str:
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"PDF extraction error: {e}")
        return text
    
    def _extract_from_word(self, file_path: str) -> str:
        try:
            doc = docx.Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            print(f"Word extraction error: {e}")
            return ""
    
    def _extract_with_ai(self, text: str) -> Dict:
        if not self.openai_client:
            return {"error": "OpenAI not configured"}
        
        try:
            prompt = f"""
            Extract the following information from this proforma invoice text:
            
            {text[:4000]}
            
            Return as JSON with these fields:
            - vendor_name: string
            - vendor_contact: string (email or phone)
            - vendor_address: string
            - total_amount: number
            - items: array of objects with description, quantity, unit_price
            - payment_terms: string
            - delivery_terms: string
            
            If any field cannot be found, use null.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a procurement data extraction assistant. Extract structured data from proforma invoices."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            return json.loads(result)
            
        except Exception as e:
            print(f"AI extraction error: {e}")
            return {"error": f"AI extraction failed: {str(e)}"}
    
    def _extract_with_rules(self, text: str) -> Dict:
        data = {
            "vendor_name": self._extract_vendor_name(text),
            "vendor_contact": self._extract_contact(text),
            "total_amount": self._extract_total_amount(text),
            "items": self._extract_items(text),
            "payment_terms": self._extract_payment_terms(text),
        }
        
        return {k: v for k, v in data.items() if v is not None}
    
    def _extract_vendor_name(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:From|Vendor|Supplier):?\s*([A-Za-z0-9\s&.,]+)(?:\n|$)",
            r"^([A-Za-z0-9\s&.,]+)\n(?:Address|Contact)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    def _extract_contact(self, text: str) -> Optional[str]:
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            return email_match.group(0)
        
        phone_match = re.search(r'(\+?(\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4})', text)
        if phone_match:
            return phone_match.group(0)
            
        return None
    
    def _extract_total_amount(self, text: str) -> Optional[float]:
        patterns = [
            r"(?:Total|Amount|Grand Total).*?[\$]?\s*([0-9,]+\.?[0-9]*)",
            r"[\$]?\s*([0-9,]+\.?[0-9]*)\s*(?:USD|EUR|GBP)?\s*(?=Total|Amount|Balance)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '')
                    return float(amount_str)
                except ValueError:
                    continue
        return None
    
    def _extract_items(self, text: str) -> List[Dict]:
        items = []
        
        lines = text.split('\n')
        for line in lines:
            item_match = re.search(r'([A-Za-z\s]+)\s+(\d+)\s+[\$]?(\d+\.?\d*)', line)
            if item_match:
                items.append({
                    "description": item_match.group(1).strip(),
                    "quantity": int(item_match.group(2)),
                    "unit_price": float(item_match.group(3))
                })
        
        return items
    
    def _extract_payment_terms(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:Payment Terms|Terms):\s*([^\n]+)",
            r"(Net \d+ days)",
            r"(Upon delivery|On receipt)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None