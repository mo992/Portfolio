from django.test import TestCase, Client
from django.utils import timezone
from .models import Customer, Product, Order, OrderDetail

class CustomerMonthlySpendingAPITest(TestCase):
    def setUp(self):
        self.client = Client()

        self.customer = Customer.objects.create(
            customer_id='A0001',
            customer_name='Roland Gao',
            email='roland.gao@email.com',
            cellphone='912345678'
        )

        self.invalid_customer = Customer.objects.create(
            customer_id='A9999',
            customer_name='Invalid Customer',
            email='invalid@email.com',
            cellphone='900000000'
        )

        self.product1 = Product.objects.create(
            product_id='P001',
            product_name='Sample Product 1',
            category='Category A',
            price=500.0
        )
        self.product2 = Product.objects.create(
            product_id='P002',
            product_name='Sample Product 2',
            category='Category B',
            price=800.0
        )

        self.order1 = Order.objects.create(
            order_id='O0001',
            order_date=timezone.now(),
            customer=self.customer
        )
        self.order2 = Order.objects.create(
            order_id='O0002',
            order_date=timezone.now(),
            customer=self.customer
        )

        OrderDetail.objects.create(
            order=self.order1,
            product=self.product1,
            quantity=2,
            price=500.0,
            payment_method='Credit Card',
            shipping_fee=50.0,
            status='Completed',
            total_amount=1050.0
        )
        OrderDetail.objects.create(
            order=self.order2,
            product=self.product2,
            quantity=1,
            price=800.0,
            payment_method='Cash',
            shipping_fee=30.0,
            status='Completed',
            total_amount=830.0
        )

    def test_valid_customer_monthly_spending(self):
        response = self.client.get(
            '/order_app/api/customer-monthly-spending/', {'customer_id': 'A0001'}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(len(data) > 0)
        self.assertIn('month', data[0])
        self.assertIn('total', data[0])

    def test_invalid_customer_monthly_spending(self):
        response = self.client.get(
            '/order_app/api/customer-monthly-spending/', {'customer_id': 'INVALID_ID'}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data, [])

    def test_missing_customer_id(self):
        response = self.client.get('/order_app/api/customer-monthly-spending/')
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_customer_order_without_details(self):
        new_customer = Customer.objects.create(
            customer_id='B0001',
            customer_name='NoDetail Customer',
            email='node@fake.com',
            cellphone='123456789'
        )
        Order.objects.create(
            order_id='O0003',
            order_date=timezone.now(),
            customer=new_customer
        )
        response = self.client.get(
            '/order_app/api/customer-monthly-spending/', {'customer_id': 'B0001'}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for record in data:
            self.assertEqual(record['total'], 0)
