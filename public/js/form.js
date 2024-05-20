document.getElementById('paymentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const amount = document.getElementById('amount').value;
    fetch('/api/initiate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: "USER_ID_HERE", // Replace with actual user ID
        amount: amount
      }),
    })
   .then(response => response.json())
   .then(data => {
      if (data.success) {
        alert("Payment initiated successfully.");
      } else {
        alert("Failed to initiate payment.");
      }
    })
   .catch((error) => {
      console.error('Error:', error);
    });
  });