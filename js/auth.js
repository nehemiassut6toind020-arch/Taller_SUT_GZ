// js/auth.js

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const alertBox = document.getElementById('alertBox');
  alertBox.style.display = 'none';

  // 1. Iniciar sesión con Supabase Auth usando supabaseClient
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (authError) {
    alertBox.innerText = 'Error de inicio de sesión: ' + authError.message;
    alertBox.style.display = 'block';
    return;
  }

  const userId = authData.user.id;

  // 2. Consultar el rol del usuario en la tabla public.profiles
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('rol')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    alertBox.innerText = 'No se encontró el perfil de usuario asociado.';
    alertBox.style.display = 'block';
    return;
  }

  // 3. Redireccionar según el rol asignado
  if (profile.rol === 'ADMIN') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
});