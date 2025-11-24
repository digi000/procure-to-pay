from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Q
import os
from .models import PurchaseRequest, Approval
from .serializers import (
    PurchaseRequestSerializer, 
    PurchaseRequestCreateSerializer,
    ApprovalSerializer
)
from .permissions import IsStaffUser, IsApproverUser, IsFinanceUser, IsOwnerOrApprover


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrApprover]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PurchaseRequestCreateSerializer
        return PurchaseRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff_role:
            return PurchaseRequest.objects.filter(created_by=user)
        
        elif user.is_approver:
            return PurchaseRequest.objects.all()
        
        elif user.is_finance:
            return PurchaseRequest.objects.filter(
                status=PurchaseRequest.Status.APPROVED
            ).annotate(
                approval_count=Count('approvals', filter=Q(approvals__approved=True))
            ).filter(approval_count=2)
        
        return PurchaseRequest.objects.none()
    
    def perform_create(self, serializer):
        if not self.request.user.is_staff_role:
            raise permissions.PermissionDenied("Only staff users can create purchase requests.")
        serializer.save()
    
    def update(self, request, *args, **kwargs):
        purchase_request = self.get_object()
        user = request.user
        
        if not user.is_staff_role or purchase_request.created_by != user:
            return Response(
                {"error": "Only the staff member who created this request can update it."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if purchase_request.status != PurchaseRequest.Status.PENDING:
            return Response(
                {"error": "Cannot update request that has been approved or rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        purchase_request = self.get_object()
        user = request.user
        
        if not user.is_staff_role or purchase_request.created_by != user:
            return Response(
                {"error": "Only the staff member who created this request can update it."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if purchase_request.status != PurchaseRequest.Status.PENDING:
            return Response(
                {"error": "Cannot update request that has been approved or rejected."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsApproverUser])
    def approve(self, request, pk=None):
        return self._handle_approval(request, pk, approved=True)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsApproverUser])
    def reject(self, request, pk=None):
        return self._handle_approval(request, pk, approved=False)
    
    def _handle_approval(self, request, pk, approved):
        purchase_request = self.get_object()
        user = request.user
        
        if not user.can_approve_request(purchase_request):
            return Response(
                {"error": "You don't have permission to approve this request."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if purchase_request.status != PurchaseRequest.Status.PENDING:
            return Response(
                {"error": "This request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            approval_level = user.get_approval_level()
            Approval.objects.create(
                purchase_request=purchase_request,
                approver=user,
                approval_level=approval_level,
                approved=approved,
                comments=request.data.get('comments', '')
            )
            
            if not approved:
                purchase_request.status = PurchaseRequest.Status.REJECTED
                purchase_request.save()
            else:
                approved_count = Approval.objects.filter(
                    purchase_request=purchase_request,
                    approved=True
                ).count()
                
                if approved_count == 2:
                    purchase_request.status = PurchaseRequest.Status.APPROVED
                    purchase_request.save()
        
        serializer = self.get_serializer(purchase_request)
        action = "approved" if approved else "rejected"
        return Response({
            "message": f"Request {action} successfully",
            "request": serializer.data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsStaffUser])
    def submit_receipt(self, request, pk=None):
        purchase_request = self.get_object()
        
        if purchase_request.created_by != request.user:
            return Response(
                {"error": "You can only submit receipts for your own requests."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if purchase_request.status != PurchaseRequest.Status.APPROVED:
            return Response(
                {"error": "Can only submit receipts for approved requests."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        receipt_file = request.FILES.get('receipt')
        if not receipt_file:
            return Response(
                {"error": "Receipt file is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
        file_extension = os.path.splitext(receipt_file.name)[1].lower()
        if file_extension not in allowed_extensions:
            return Response(
                {"error": f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (optional - 10MB limit)
        if receipt_file.size > 10 * 1024 * 1024:
            return Response(
                {"error": "File size too large. Maximum size is 10MB."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_request.receipt = receipt_file
        purchase_request.save()
        
        serializer = self.get_serializer(purchase_request)
        return Response({
            "message": "Receipt submitted successfully",
            "request": serializer.data
        })