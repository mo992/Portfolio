document.addEventListener('DOMContentLoaded', function () {
    fetch('http://127.0.0.1:8000/order_app/customers/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const tbody = document.querySelector('#customer-table tbody');
            tbody.innerHTML = '';

            data.forEach(customer => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${customer.customer_id}</td>
                    <td>${customer.customer_name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.cellphone}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});
