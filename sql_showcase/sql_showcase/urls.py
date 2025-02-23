from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('order_app/', include('order_app.urls')),
    path('', RedirectView.as_view(url='order_app/', permanent=False)),
]
