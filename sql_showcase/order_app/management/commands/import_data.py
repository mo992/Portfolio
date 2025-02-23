import csv
from django.core.management.base import BaseCommand
from order_app.models import Customer, Product, Order, OrderDetail

class Command(BaseCommand):
    help = 'Import orders from a CSV file into SQLite'

    def handle(self, *args, **kwargs):
        customer_file_path = 'order_app/sample_data/customer_info.csv'
        product_file_path = 'order_app/sample_data/product_details.csv'
        order_file_path = 'order_app/sample_data/order_status.csv'

        with open(customer_file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                Customer.objects.get_or_create(
                    customer_id=row['customer_id'],
                    customer_name=row['customer_name'],
                    email=row['email'],
                    cellphone=row['cellphone']
                )

        with open(product_file_path, newline='', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                Product.objects.get_or_create(
                    product_id=row['product_id'],
                    product_name=row['product_name'],
                    category=row['category'],
                    price=float(row['price'])
                )

        with open(order_file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                customer = Customer.objects.get(customer_id=row['customer_id'])
                try:
                    product = Product.objects.get(product_id=row['product_id'].strip())
                except Product.DoesNotExist:
                    self.stdout.write(self.style.ERROR(
                        f"Product ID {row['product_id']} not found in the database. Skipping row."
                    ))
                    continue
                order, _ = Order.objects.get_or_create(
                    order_id=row['order_id'],
                    customer=customer,
                    order_date = row['order_date'],
                )

                OrderDetail.objects.get_or_create(
                    order=order,
                    product=product,
                    quantity = int(row['quantity']),
                    price = float(row['price']),
                    payment_method = row['payment_method'],
                    shipping_fee =  float(row['shipping_fee']),
                    status = row['status'],
                    total_amount = float(row['price'])*int(row['quantity'])+float(row['shipping_fee'])
                    )

        self.stdout.write(self.style.SUCCESS('Successfully imported CSV data into SQLite'))
