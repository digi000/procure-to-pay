from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import PurchaseRequestViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'requests', PurchaseRequestViewSet, basename='purchase-request')

urlpatterns = [
    path('api/', include(router.urls)),
]