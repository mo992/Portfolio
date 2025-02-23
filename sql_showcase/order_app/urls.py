from django.urls import path
from django.views.generic import RedirectView
from .views import customer_table_view, customer_monthly_spending, customer_spending_view, \
    get_customers

urlpatterns = [
    path('', RedirectView.as_view(url='customer-spending/', permanent=False)),
    path('customer-table/', customer_table_view, name='customer-table'),
    path('api/customers/', get_customers, name='get-customers'),
    path('api/customer-monthly-spending/', customer_monthly_spending, name='customer-monthly-spending'),
    path('customer-spending/', customer_spending_view, name='customer-spending'),
]
