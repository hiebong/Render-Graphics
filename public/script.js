const form = document.getElementById("orderForm");

if(form){

form.addEventListener("submit", async function(e){

e.preventDefault();

const formData = new FormData(form);

const response = await fetch("/api/order",{
method:"POST",
body:formData
});

const data = await response.json();

alert("Order submitted! Please check the payment instructions below.");

form.reset();

});

}