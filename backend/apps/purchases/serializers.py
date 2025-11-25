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
    class Meta:
        model = PurchaseRequest
        fields = [
            'title', 'description', 'amount', 'urgency',
            'vendor_name', 'vendor_contact', 'requested_delivery_date',
            'cost_center', 'gl_account', 'budget_code', 'project_code',
            'business_justification', 'proforma', 'quotation_comparison', 'specification_sheet'
        ]
        extra_kwargs = {
            'title': {'required': False},
            'description': {'required': False},
            'amount': {'required': False},
            'vendor_name': {'required': False},
            'business_justification': {'required': False},
        }

    def validate(self, attrs):
        proforma = attrs.get('proforma')
        
        if not proforma:
            if not attrs.get('title'):
                raise serializers.ValidationError({"title": "Title is required when proforma is not provided."})
            if not attrs.get('amount'):
                raise serializers.ValidationError({"amount": "Amount is required when proforma is not provided."})
            if not attrs.get('vendor_name'):
                raise serializers.ValidationError({"vendor_name": "Vendor name is required when proforma is not provided."})
            if not attrs.get('business_justification'):
                raise serializers.ValidationError({"business_justification": "Business justification is required when proforma is not provided."})
        
        return attrs

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
        proforma_file = validated_data.pop('proforma', None)
        validated_data['created_by'] = self.context['request'].user
        
        if proforma_file:
            extracted_data = self._extract_proforma_data(proforma_file)
            
            if not extracted_data.get('error'):
                validated_data = self._merge_data(validated_data, extracted_data)
        
        purchase_request = PurchaseRequest.objects.create(**validated_data)
        
        if proforma_file:
            purchase_request.proforma = proforma_file
            purchase_request.save()
        
        return purchase_request
    
    def _extract_proforma_data(self, proforma_file):
        try:
            from apps.documents.processors.proforma_processor import ProformaProcessor
            import tempfile
            import os
            
            processor = ProformaProcessor()
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                for chunk in proforma_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name
            
            extracted_data = processor.extract_data(tmp_path)
            
            os.unlink(tmp_path)
            
            return extracted_data
            
        except Exception as e:
            print(f"Proforma extraction error: {e}")
            return {'error': str(e)}

    def _merge_data(self, manual_data, extracted_data):
        field_mapping = {
            'vendor_name': 'vendor_name',
            'vendor_contact': 'vendor_contact', 
            'total_amount': 'amount',
            'title': 'title',
            'description': 'description',
        }
        
        for extracted_field, model_field in field_mapping.items():
            if extracted_data.get(extracted_field):
                if not manual_data.get(model_field):
                    manual_data[model_field] = extracted_data[extracted_field]
        
        return manual_data
    
    def _process_proforma(self, purchase_request, proforma_file):
        try:
            from apps.documents.processors.proforma_processor import ProformaProcessor
            
            processor = ProformaProcessor()
            
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                for chunk in proforma_file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name
            
            extracted_data = processor.extract_data(tmp_path)
            
            if not extracted_data.get('error'):
                self._update_from_extracted_data(purchase_request, extracted_data)
            
            os.unlink(tmp_path)
            
        except Exception as e:
            print(f"Proforma processing error: {e}")
    
    def _update_from_extracted_data(self, purchase_request, extracted_data):
        update_fields = []
        
        if extracted_data.get('vendor_name') and not purchase_request.vendor_name:
            purchase_request.vendor_name = extracted_data['vendor_name']
            update_fields.append('vendor_name')
        
        if extracted_data.get('vendor_contact') and not purchase_request.vendor_contact:
            purchase_request.vendor_contact = extracted_data['vendor_contact']
            update_fields.append('vendor_contact')
        
        if extracted_data.get('total_amount') and not purchase_request.amount:
            extracted_amount = extracted_data['total_amount']
            if extracted_amount > 0:
                purchase_request.amount = extracted_amount
                update_fields.append('amount')
        
        if update_fields:
            purchase_request.save(update_fields=update_fields)

    def validate_proforma(self, value):
        import os
        allowed_extensions = ['.pdf', '.doc', '.docx', '.txt']
        file_extension = os.path.splitext(value.name)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"Unsupported file format. Please upload: {', '.join(allowed_extensions)}"
            )
        return value