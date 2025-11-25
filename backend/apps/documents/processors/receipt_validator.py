import re
import json
from typing import Dict, List, Optional
from django.core.files.base import ContentFile
from apps.purchases.models import PurchaseRequest, PurchaseOrder


class ReceiptValidator:
    def __init__(self):
        pass
    
    def validate_receipt(self, purchase_request_id: int, receipt_file_path: str) -> Dict:
        try:
            purchase_request = PurchaseRequest.objects.get(id=purchase_request_id)
            
            if not hasattr(purchase_request, 'purchase_order_doc'):
                return {
                    "valid": False,
                    "error": "No purchase order found for validation"
                }
            
            po_data = self._get_po_data(purchase_request)
            
            receipt_data = self._extract_receipt_data(receipt_file_path)
            
            if receipt_data.get('error'):
                return {
                    "valid": False,
                    "error": receipt_data['error']
                }
            
            validation_result = self._compare_po_receipt(po_data, receipt_data)
            
            return validation_result
            
        except PurchaseRequest.DoesNotExist:
            return {
                "valid": False,
                "error": "Purchase request not found"
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Validation failed: {str(e)}"
            }
    
    def _get_po_data(self, purchase_request: PurchaseRequest) -> Dict:
        po = purchase_request.purchase_order_doc
        
        if po.po_data_file:
            return {
                'vendor_name': po.po_data_file.get('vendor_name', po.vendor_name),
                'total_amount': float(po.po_data_file.get('total_amount', po.total_amount)),
                'items': po.po_data_file.get('items', []),
                'po_number': po.po_number,
                'has_detailed_items': False
            }
        
        return {
            'vendor_name': po.vendor_name,
            'total_amount': float(po.total_amount),
            'items': [],
            'po_number': po.po_number,
            'has_detailed_items': False
        }
    
    def _extract_receipt_data(self, file_path: str) -> Dict:
        try:
            from .proforma_processor import ProformaProcessor
            processor = ProformaProcessor()
            text = processor._extract_text(file_path)
            
            if not text:
                return {"error": "Could not extract text from receipt"}
            
            receipt_data = self._extract_with_ai(text)
            if receipt_data and not receipt_data.get('error'):
                return receipt_data
            
            return self._extract_with_rules(text)
            
        except Exception as e:
            return {"error": f"Receipt extraction failed: {str(e)}"}
    
    def _extract_with_ai(self, text: str) -> Dict:
        try:
            from openai import OpenAI
            from django.conf import settings
            
            if not hasattr(settings, 'OPENAI_API_KEY') or not settings.OPENAI_API_KEY:
                return {"error": "OpenAI not configured"}
            
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            prompt = f"""
            Extract receipt information from this text:
            
            {text[:3000]}
            
            Return as JSON with these fields:
            - vendor_name: string
            - total_amount: number
            - receipt_date: string (if found)
            - items: array of objects with description, quantity, unit_price, total_price
            
            If any field cannot be found, use null.
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a receipt data extraction assistant. Extract structured data from receipts."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            return json.loads(result)
            
        except Exception as e:
            return {"error": f"AI extraction failed: {str(e)}"}
    
    def _extract_with_rules(self, text: str) -> Dict:
        data = {
            "vendor_name": self._extract_vendor_from_receipt(text),
            "total_amount": self._extract_total_from_receipt(text),
            "items": self._extract_items_from_receipt(text),
        }
        
        return {k: v for k, v in data.items() if v is not None}
    
    def _extract_vendor_from_receipt(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:From|Vendor|Store|Merchant):?\s*([A-Za-z0-9\s&.,]+)(?:\n|$)",
            r"^([A-Za-z0-9\s&.,]+)\n(?:Receipt|Invoice|Bill)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    def _extract_total_from_receipt(self, text: str) -> Optional[float]:
        patterns = [
            r"(?:Total|Amount Due|Grand Total).*?[\$]?\s*([0-9,]+\.?[0-9]*)",
            r"[\$]?\s*([0-9,]+\.?[0-9]*)\s*(?:USD|EUR|GBP)?\s*(?=Total|Amount|Balance|Due)",
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
    
    def _extract_items_from_receipt(self, text: str) -> List[Dict]:
        items = []
        lines = text.split('\n')
        
        for line in lines:
            item_match = re.search(r'([A-Za-z\s]+)\s+[\$]?(\d+\.?\d*)', line)
            if item_match and len(item_match.group(1).strip()) > 3:
                items.append({
                    "description": item_match.group(1).strip(),
                    "quantity": 1,
                    "unit_price": float(item_match.group(2)),
                    "total_price": float(item_match.group(2))
                })
        
        return items
    
    def _compare_po_receipt(self, po_data: Dict, receipt_data: Dict) -> Dict:
        discrepancies = []
        
        if (po_data.get('vendor_name') and receipt_data.get('vendor_name') and
            po_data['vendor_name'].lower() != receipt_data['vendor_name'].lower()):
            discrepancies.append({
                "field": "vendor_name",
                "po_value": po_data['vendor_name'],
                "receipt_value": receipt_data['vendor_name'],
                "severity": "high",
                "message": "Vendor name does not match purchase order"
            })
        
        if po_data.get('total_amount') and receipt_data.get('total_amount'):
            po_amount = po_data['total_amount']
            receipt_amount = receipt_data['total_amount']
            difference = abs(po_amount - receipt_amount)
            tolerance = po_amount * 0.10
            
            if difference > tolerance:
                discrepancies.append({
                    "field": "total_amount",
                    "po_value": f"${po_amount:.2f}",
                    "receipt_value": f"${receipt_amount:.2f}",
                    "severity": "high" if difference > po_amount * 0.20 else "medium",
                    "message": f"Amount difference: ${difference:.2f} (${po_amount:.2f} vs ${receipt_amount:.2f})"
                })
        
        po_items = po_data.get('items', [])
        receipt_items = receipt_data.get('items', [])
        
        if po_data.get('has_detailed_items') and po_items and receipt_items:
            if len(po_items) != len(receipt_items):
                discrepancies.append({
                    "field": "item_count",
                    "po_value": len(po_items),
                    "receipt_value": len(receipt_items),
                    "severity": "medium",
                    "message": f"Item count mismatch: PO has {len(po_items)} items, receipt has {len(receipt_items)}"
                })
        
        is_valid = len([d for d in discrepancies if d['severity'] == 'high']) == 0
        
        return {
            "valid": is_valid,
            "discrepancies": discrepancies,
            "po_data": {
                "po_number": po_data.get('po_number'),
                "vendor_name": po_data.get('vendor_name'),
                "total_amount": po_data.get('total_amount')
            },
            "receipt_data": {
                "vendor_name": receipt_data.get('vendor_name'),
                "total_amount": receipt_data.get('total_amount'),
                "items_count": len(receipt_data.get('items', []))
            }
        }