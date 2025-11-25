from django.db import models
from django.conf import settings


class PurchaseRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
    
    class Urgency(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.NORMAL)
    
    vendor_name = models.CharField(max_length=200, blank=True)
    vendor_contact = models.CharField(max_length=200, blank=True)
    vendor_address = models.TextField(blank=True)
    
    requested_delivery_date = models.DateField(null=True, blank=True)
    
    cost_center = models.CharField(max_length=50, blank=True)
    gl_account = models.CharField(max_length=50, blank=True)
    budget_code = models.CharField(max_length=50, blank=True)
    project_code = models.CharField(max_length=50, blank=True)
    
    business_justification = models.TextField(blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_requests')
    
    proforma = models.FileField(upload_to='proformas/', null=True, blank=True)
    quotation_comparison = models.FileField(upload_to='quotations/', null=True, blank=True)
    specification_sheet = models.FileField(upload_to='specifications/', null=True, blank=True)
    purchase_order = models.FileField(upload_to='purchase_orders/', null=True, blank=True)
    receipt = models.FileField(upload_to='receipts/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_by']),
            models.Index(fields=['created_at']),
            models.Index(fields=['urgency']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()} - ${self.amount}"
    
class Approval(models.Model):
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='approvals_given'
    )
    approval_level = models.IntegerField(choices=[(1, 'Level 1'), (2, 'Level 2')])
    approved = models.BooleanField()
    comments = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'approvals'
        ordering = ['-created_at']
        unique_together = ['purchase_request', 'approval_level']
    
    def __str__(self):
        action = "Approved" if self.approved else "Rejected"
        return f"{self.approver.username} {action} L{self.approval_level}"
    
class PurchaseOrder(models.Model):
    purchase_request = models.OneToOneField(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='purchase_order_doc'
    )
    
    po_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField(auto_now_add=True)
    terms = models.TextField(blank=True, help_text="Payment and delivery terms")
    
    vendor_name = models.CharField(max_length=200)
    vendor_contact = models.CharField(max_length=200, blank=True)
    vendor_address = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    po_document = models.FileField(
        upload_to='purchase_orders/',
        null=True,
        blank=True,
        help_text="Generated PO document"
    )
    po_data_file = models.JSONField(
        null=True,
        blank=True,
        help_text="Detailed PO data in JSON format"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-issue_date']
    
    def __str__(self):
        return f"PO-{self.po_number} - {self.vendor_name} - ${self.total_amount}"
    
    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = self.generate_po_number()
        super().save(*args, **kwargs)
    
    def generate_po_number(self):
        from django.utils import timezone
        date_part = timezone.now().strftime('%Y%m%d')
        last_po = PurchaseOrder.objects.filter(po_number__startswith=f"PO-{date_part}").order_by('-id').first()
        
        if last_po:
            last_num = int(last_po.po_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
            
        return f"PO-{date_part}-{new_num:04d}"