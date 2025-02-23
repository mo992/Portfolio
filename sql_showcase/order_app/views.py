from .models import Customer
from django.shortcuts import render
from django.http import JsonResponse
from django.db import connection


def customer_table_view(request):
    return render(request, 'order_app/customer_table.html')

def customer_monthly_spending(request):
    customer_id = request.GET.get('customer_id')
    if not customer_id:
        return JsonResponse({'error': '缺少 customer_id 參數'}, status=400)

    query = """
        SELECT CAST(strftime('%%m', o.order_date) AS INTEGER) AS month, 
               COALESCE(SUM(od.total_amount), 0) AS total
        FROM order_app_order AS o
        LEFT JOIN order_app_orderdetail AS od ON o.order_id = od.order_id
        WHERE o.customer_id = %s
        GROUP BY month
        ORDER BY month;
    """

    with connection.cursor() as cursor:
        try:
            cursor.execute(query, [customer_id])
            rows = cursor.fetchall()
        except Exception as e:
            print(f"SQL Query Error for customer_id={customer_id}: {e}")
            return JsonResponse({'error': f'SQL 執行錯誤: {str(e)}'}, status=500)

    result = [{'month': row[0], 'total': row[1]} for row in rows]
    return JsonResponse(result, safe=False)

def customer_spending_view(request):
    return render(request, 'order_app/customer_spending.html')

def get_customers(request):
    customers = Customer.objects.all().values('customer_id', 'customer_name')
    return JsonResponse(list(customers), safe=False)