from rest_framework import serializers
from .models import PurchaseRequest, Approval


class ApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(source='approver.username', read_only=True)
    approver_role = serializers.CharField(source='approver.get_role_display', read_only=True)
    
    class Meta:
        model = Approval
        fields = [
            'id', 'approver', 'approver_name', 'approver_role', 
            'approval_level', 'approved', 'comments', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PurchaseRequestSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    approvals = ApprovalSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'title', 'description', 'amount', 'status', 'status_display',
            'created_by', 'created_by_name', 'proforma', 'purchase_order', 'receipt',
            'urgency', 'vendor_name', 'vendor_contact', 'requested_delivery_date',
            'cost_center', 'gl_account', 'budget_code', 'project_code',
            'business_justification', 'quotation_comparison', 'specification_sheet',
            'approvals', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'created_by', 'created_by_name', 
            'purchase_order', 'created_at', 'updated_at'
        ]


class PurchaseRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating requests (staff only)"""
    class Meta:
        model = PurchaseRequest
        fields = [
            'title', 'description', 'amount', 'urgency',
            'vendor_name', 'vendor_contact', 'requested_delivery_date',
            'cost_center', 'gl_account', 'budget_code', 'project_code',
            'business_justification', 'proforma', 'quotation_comparison', 'specification_sheet'
        ]
        extra_kwargs = {
            'business_justification': {'required': True},
            'vendor_name': {'required': True},
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_requested_delivery_date(self, value):
        from django.utils import timezone
        if value and value < timezone.now().date():
            raise serializers.ValidationError("Delivery date cannot be in the past.")
        return value

    def create(self, validated_data):
        # Auto-set the created_by field to the current user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)