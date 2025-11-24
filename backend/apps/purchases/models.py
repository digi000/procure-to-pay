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
    approved = models.BooleanField()  # True for approved, False for rejected
    comments = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'approvals'
        ordering = ['-created_at']
        unique_together = ['purchase_request', 'approval_level']
    
    def __str__(self):
        action = "Approved" if self.approved else "Rejected"
        return f"{self.approver.username} {action} L{self.approval_level}"