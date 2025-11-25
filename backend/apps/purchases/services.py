import json
import io
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from .models import PurchaseRequest, PurchaseOrder


class PurchaseOrderGenerator:
    """
    Service to automatically generate purchase order DATA (not documents)
    """
    
    @staticmethod
    def generate_po(purchase_request_id):
        """
        Generate purchase order data for a fully approved purchase request
        """
        try:
            purchase_request = PurchaseRequest.objects.get(id=purchase_request_id)
            
            # Check if request is fully approved
            if not PurchaseOrderGenerator._is_fully_approved(purchase_request):
                return None, "Request is not fully approved"
            
            # Check if PO already exists
            if hasattr(purchase_request, 'purchase_order_doc'):
                return purchase_request.purchase_order_doc, "PO already exists"
            
            # Extract PO data
            po_data = PurchaseOrderGenerator._extract_po_data(purchase_request)
            
            # Create PurchaseOrder record first to get PO number
            purchase_order = PurchaseOrder.objects.create(
                purchase_request=purchase_request,
                vendor_name=po_data['vendor_name'],
                vendor_contact=po_data['vendor_contact'],
                vendor_address=po_data['vendor_address'],
                total_amount=po_data['total_amount'],
                terms=json.dumps(po_data['terms'])
            )
            
            # Generate PDF with PO number
            po_pdf_file = PurchaseOrderGenerator._create_po_pdf(po_data, purchase_order.po_number)
            
            # Update PurchaseOrder with PDF
            purchase_order.po_document = po_pdf_file
            purchase_order.save()
            
            # Also store PO document in purchase request for easy access
            purchase_request.purchase_order = po_pdf_file
            purchase_request.save()
            
            return purchase_order, "PO data generated successfully"
            
        except PurchaseRequest.DoesNotExist:
            return None, "Purchase request not found"
        except Exception as e:
            return None, f"PO generation failed: {str(e)}"
    
    @staticmethod
    def _is_fully_approved(purchase_request):
        """
        Check if all required approval levels have approved (both Level 1 and Level 2)
        """
        # Check that both approval levels have approved
        level_1_approved = purchase_request.approvals.filter(
            approval_level=1,
            approved=True
        ).exists()
        
        level_2_approved = purchase_request.approvals.filter(
            approval_level=2,
            approved=True
        ).exists()
        
        return level_1_approved and level_2_approved
    
    @staticmethod
    def _extract_po_data(purchase_request):
        """
        Extract comprehensive PO data from purchase request
        """
        # Get all approvals with details
        approvals_data = []
        for approval in purchase_request.approvals.all().order_by('approval_level'):
            approvals_data.append({
                'level': approval.approval_level,
                'approver_name': approval.approver.get_full_name() or approval.approver.username,
                'approver_role': approval.approver.get_role_display(),
                'approved': approval.approved,
                'comments': approval.comments,
                'timestamp': approval.created_at.isoformat()
            })
        
        return {
            # Basic request info
            'title': purchase_request.title,
            'description': purchase_request.description,
            'amount': str(purchase_request.amount),
            'total_amount': purchase_request.amount,  # For PurchaseOrder model
            'urgency': purchase_request.urgency,
            
            # Vendor information
            'vendor_name': purchase_request.vendor_name or 'Vendor Name',
            'vendor_contact': purchase_request.vendor_contact or 'Contact Information',
            'vendor_address': purchase_request.vendor_address or 'Vendor Address',
            
            # Delivery & timeline
            'requested_delivery_date': purchase_request.requested_delivery_date.isoformat() if purchase_request.requested_delivery_date else None,
            
            # Budget information
            'cost_center': purchase_request.cost_center,
            'gl_account': purchase_request.gl_account,
            'budget_code': purchase_request.budget_code,
            'project_code': purchase_request.project_code,
            
            # Business context
            'business_justification': purchase_request.business_justification,
            
            # Requester information
            'created_by': {
                'name': purchase_request.created_by.get_full_name() or purchase_request.created_by.username,
                'email': purchase_request.created_by.email,
                'department': purchase_request.created_by.department,
                'employee_id': purchase_request.created_by.employee_id
            },
            
            # Approval history
            'approvals': approvals_data,
            
            # Terms and conditions
            'terms': PurchaseOrderGenerator._get_default_terms(),
            
            # Timestamps
            'request_created_at': purchase_request.created_at.isoformat(),
            'po_generated_at': timezone.now().isoformat()
        }
    
    @staticmethod
    def _get_default_terms():
        """
        Get default PO terms and conditions
        """
        return {
            "payment_terms": "Net 30 days",
            "delivery_terms": "As per agreed timeline",
            "quality_terms": "Goods must meet specified standards",
            "return_policy": "Defective items may be returned within 30 days",
            "warranty": "Standard manufacturer warranty applies"
        }
    
    @staticmethod
    def _create_po_pdf(po_data, po_number):
        """
        Create a professional PDF purchase order document
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72,
                                topMargin=72, bottomMargin=18)
        
        # Container for PDF elements
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=12
        )
        
        # Title
        elements.append(Paragraph("PURCHASE ORDER", title_style))
        elements.append(Spacer(1, 12))
        
        # PO Number and Date
        po_info_data = [
            ['PO Number:', po_number],
            ['Issue Date:', timezone.now().strftime('%B %d, %Y')],
            ['Status:', 'APPROVED']
        ]
        po_info_table = Table(po_info_data, colWidths=[2*inch, 3*inch])
        po_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1a237e')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(po_info_table)
        elements.append(Spacer(1, 20))
        
        # Vendor Information
        elements.append(Paragraph("Vendor Information", heading_style))
        vendor_data = [
            ['Vendor Name:', po_data['vendor_name']],
            ['Contact:', po_data['vendor_contact']],
            ['Address:', po_data['vendor_address']],
        ]
        vendor_table = Table(vendor_data, colWidths=[1.5*inch, 4.5*inch])
        vendor_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(vendor_table)
        elements.append(Spacer(1, 20))
        
        # Request Details
        elements.append(Paragraph("Request Details", heading_style))
        request_data = [
            ['Title:', po_data['title']],
            ['Description:', po_data['description']],
            ['Amount:', f"${po_data['amount']}"],
            ['Urgency:', po_data['urgency'].upper()],
            ['Delivery Date:', po_data['requested_delivery_date'] or 'As agreed'],
        ]
        request_table = Table(request_data, colWidths=[1.5*inch, 4.5*inch])
        request_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(request_table)
        elements.append(Spacer(1, 20))
        
        # Financial Information
        elements.append(Paragraph("Financial Information", heading_style))
        financial_data = [
            ['Cost Center:', po_data.get('cost_center', 'N/A')],
            ['GL Account:', po_data.get('gl_account', 'N/A')],
            ['Budget Code:', po_data.get('budget_code', 'N/A')],
            ['Project Code:', po_data.get('project_code', 'N/A')],
        ]
        financial_table = Table(financial_data, colWidths=[1.5*inch, 4.5*inch])
        financial_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(financial_table)
        elements.append(Spacer(1, 20))
        
        # Approvals
        elements.append(Paragraph("Approval History", heading_style))
        approval_data = [['Level', 'Approver', 'Role', 'Date', 'Status']]
        for approval in po_data['approvals']:
            approval_data.append([
                f"Level {approval['level']}",
                approval['approver_name'],
                approval['approver_role'],
                approval['timestamp'][:10],
                'Approved' if approval['approved'] else 'Rejected'
            ])
        
        approval_table = Table(approval_data, colWidths=[0.8*inch, 1.5*inch, 1.5*inch, 1.2*inch, 1*inch])
        approval_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a237e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ]))
        elements.append(approval_table)
        elements.append(Spacer(1, 20))
        
        # Terms and Conditions
        elements.append(Paragraph("Terms and Conditions", heading_style))
        terms = po_data['terms']
        terms_text = f"""
        <b>Payment Terms:</b> {terms['payment_terms']}<br/>
        <b>Delivery Terms:</b> {terms['delivery_terms']}<br/>
        <b>Quality Terms:</b> {terms['quality_terms']}<br/>
        <b>Return Policy:</b> {terms['return_policy']}<br/>
        <b>Warranty:</b> {terms['warranty']}
        """
        elements.append(Paragraph(terms_text, styles['Normal']))
        elements.append(Spacer(1, 30))
        
        # Footer
        footer_text = f"<i>This is an automatically generated purchase order. Generated on {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}</i>"
        elements.append(Paragraph(footer_text, styles['Normal']))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create ContentFile
        filename = f"PO_{po_number}_{timezone.now().strftime('%Y%m%d')}.pdf"
        return ContentFile(pdf_data, name=filename)