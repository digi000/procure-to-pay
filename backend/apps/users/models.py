from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model with role-based access control for Procure-to-Pay system
    """
    
    class Role(models.TextChoices):
        STAFF = 'staff', 'Staff'
        APPROVER_LEVEL_1 = 'approver_l1', 'Approver Level 1'
        APPROVER_LEVEL_2 = 'approver_l2', 'Approver Level 2' 
        FINANCE = 'finance', 'Finance Team'
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STAFF,
        help_text="User's role in the procurement workflow"
    )
    
    department = models.CharField(
        max_length=100,
        blank=True,
        help_text="Department or team the user belongs to"
    )
    
    employee_id = models.CharField(
        max_length=50,
        blank=True,
        unique=True,
        null=True,
        help_text="Unique employee identifier"
    )
    
    # Manager relationships for approval hierarchy
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_reports',
        help_text="Direct manager for approval workflow"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['department']),
            models.Index(fields=['manager']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    # Property methods for easy role checking
    @property
    def is_staff_role(self):
        return self.role == self.Role.STAFF
    
    @property
    def is_approver_level_1(self):
        return self.role == self.Role.APPROVER_LEVEL_1
    
    @property
    def is_approver_level_2(self):
        return self.role == self.Role.APPROVER_LEVEL_2
    
    @property
    def is_finance(self):
        return self.role == self.Role.FINANCE
    
    @property
    def is_approver(self):
        """Check if user has any approval permissions"""
        return self.role in [self.Role.APPROVER_LEVEL_1, self.Role.APPROVER_LEVEL_2]
    
    def get_approval_level(self):
        """Get numeric approval level for workflow logic"""
        approval_levels = {
            self.Role.APPROVER_LEVEL_1: 1,
            self.Role.APPROVER_LEVEL_2: 2,
        }
        return approval_levels.get(self.role, 0)


class UserProfile(models.Model):
    """
    Extended profile information for users
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    
    phone_number = models.CharField(max_length=20, blank=True)
    
    job_title = models.CharField(max_length=100, blank=True)
    
    signature = models.ImageField(
        upload_to='user_signatures/',
        null=True,
        blank=True,
        help_text="Digital signature for approvals"
    )
    
    notification_preferences = models.JSONField(
        default=dict,
        help_text="User preferences for email notifications"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"