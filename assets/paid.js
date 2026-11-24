/* Shows the cancelled message when Stripe returns with ?cancelled. */
if(new URLSearchParams(location.search).has('cancelled')){document.getElementById('t').textContent='Payment cancelled';document.getElementById('m').textContent='No charge was made. Go back to Photobylens to try again or take the free standard download.';}
