// js/cliente.js

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar si hay sesión activa usando supabaseClient
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const userId = session.user.id;

  // 2. Obtener datos del perfil del cliente
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('nombre_completo')
    .eq('id', userId)
    .single();

  if (profile) {
    document.getElementById('userName').innerText = profile.nombre_completo;
  }

  // 3. Cargar los vehículos del cliente con sus últimos servicios
  cargarVehiculosCliente(userId);

  // Botón para cerrar sesión
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });
});

async function cargarVehiculosCliente(userId) {
  const container = document.getElementById('vehiculosContainer');

  // Consulta de vehículos pertenecientes al usuario
  const { data: vehiculos, error } = await supabaseClient
    .from('vehiculos')
    .select('*')
    .eq('id_propietario', userId);

  if (error || !vehiculos || vehiculos.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1;">No tienes vehículos registrados en el taller.</p>';
    return;
  }

  container.innerHTML = '';

  // Recorrer los vehículos y buscar su último servicio
  for (const car of vehiculos) {
    const { data: servicios } = await supabaseClient
      .from('servicios')
      .select('*')
      .eq('id_vehiculo', car.id)
      .order('fecha_servicio', { ascending: false })
      .limit(1);

    const ultimoServicio = servicios && servicios.length > 0 ? servicios[0] : null;

    const carCardHtml = `
      <div class="car-card">
        <div class="car-header">
          <h3>${car.marca} ${car.linea || ''} (${car.modelo})</h3>
          <span>Placa: ${car.placa} | Color: ${car.color}</span>
        </div>
        
        ${ultimoServicio ? `
          <div class="info-row">
            <span class="info-label">Tipo de Aceite Usado:</span>
            <span class="info-value">${ultimoServicio.tipo_aceite}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Último Servicio:</span>
            <span class="info-value">${ultimoServicio.fecha_servicio}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Km del Últo. Servicio:</span>
            <span class="info-value">${ultimoServicio.kilometraje_actual} km</span>
          </div>
          <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 10px 0;">
          <div class="info-row">
            <span class="info-label">Próximo Servicio (Km):</span>
            <span class="info-value" style="color: #0284c7;">${ultimoServicio.kilometraje_proximo_servicio} km</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha Est. Próximo:</span>
            <span class="info-value" style="color: #0284c7;">${ultimoServicio.fecha_proximo_servicio || 'No programada'}</span>
          </div>
        ` : `
          <p class="badge">Sin mantenimientos registrados aún</p>
        `}
      </div>
    `;

    container.innerHTML += carCardHtml;
  }
}