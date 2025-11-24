from rest_framework import permissions


class IsStaffUser(permissions.BasePermission):
    """
    Allows access only to staff users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff_role)


class IsApproverUser(permissions.BasePermission):
    """
    Allows access only to approver users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_approver)


class IsFinanceUser(permissions.BasePermission):
    """
    Allows access only to finance users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_finance)


class IsOwnerOrApprover(permissions.BasePermission):
    """
    Allows access to owners (creators) or approvers.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff_role:
            return obj.created_by == request.user
        return request.user.is_approver or request.user.is_finance