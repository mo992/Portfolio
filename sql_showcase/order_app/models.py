from django.db import models

class Customer(models.Model):
    customer_id = models.CharField(max_length=5, primary_key=True)
    customer_name = models.CharField(max_length=50)
    email = models.EmailField(max_length=100)
    cellphone = models.CharField(max_length=9)

    def __str__(self):
        return self.customer_name

class Product(models.Model):
    product_id = models.CharField(max_length=10, primary_key=True)
    product_name = models.CharField(max_length=100)
    category = models.CharField(max_length=50)
    price = models.FloatField()

    def __str__(self):
        return self.product_name

class Order(models.Model):
    order_id = models.CharField(max_length=10, primary_key=True)
    order_date = models.DateField()
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)

    def __str__(self):
        return f"Order {self.order_id} for {self.customer.customer_name}"

class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="order_details")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    price = models.FloatField()
    payment_method = models.CharField(max_length=50)
    shipping_fee = models.FloatField()
    status = models.CharField(max_length=50)
    total_amount = models.FloatField()

    def __str__(self):
        return f"Order {self.order.order_id} for {self.product.product_name}"
