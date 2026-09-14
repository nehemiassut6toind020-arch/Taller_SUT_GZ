document.addEventListener('DOMContentLoaded', async () => {
  // 1. Validar sesión
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const userId = session.user.id;

  // 2. Obtener nombre del perfil
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('nombre_completo')
    .eq('id', userId)
    .single();

  if (profile) {
    document.getElementById('userName').innerText = profile.nombre_completo;
  }

  // 3. Cargar vehículos y su historial técnico
  cargarVehiculosYServicios(userId);

  // Cierre de sesión
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });
});

async function cargarVehiculosYServicios(userId) {
  const container = document.getElementById('vehiculosContainer');

  try {
    // Consulta los vehículos pertenecientes al cliente
    const { data: vehiculos, error: errVeh } = await supabaseClient
      .from('vehiculos')
      .select('*')
      .eq('propietario_id', userId);

    if (errVeh) throw errVeh;

    if (!vehiculos || vehiculos.length === 0) {
      container.innerHTML = '<p style="color: #64748b;">No tienes vehículos registrados en el taller.</p>';
      return;
    }

    container.innerHTML = '';

    for (const car of vehiculos) {
      // Obtener TODOS los servicios asociados al vehículo
      const { data: servicios, error: errServ } = await supabaseClient
        .from('servicios')
        .select('*')
        .eq('vehiculo_id', car.id)
        .order('created_at', { ascending: false });

      if (errServ) console.error('Error servicios:', errServ);

      let serviciosHtml = '';

      if (servicios && servicios.length > 0) {
        servicios.forEach(serv => {
          const fecha = new Date(serv.created_at).toLocaleDateString('es-GT', {
            year: 'numeric', month: 'short', day: 'numeric'
          });

          serviciosHtml += `
            <div class="service-box">
              <div class="service-title">
                <span>🛠️ ${serv.tipo_servicio}</span>
                <span style="color: #64748b; font-weight: normal; font-size: 0.85rem;">📅 ${fecha}</span>
              </div>

              <div style="font-size: 0.88rem; margin-bottom: 5px;">
                <strong>Kilometraje Registrado:</strong> ${serv.km_actual} KM
              </div>

              <div class="details-text">
                <strong>Trabajos Realizados / Diagnóstico:</strong><br>
                ${serv.detalles_trabajo || 'Mantenimiento técnico general.'}
              </div>

              ${serv.cambio_aceite_motor ? `
                <div class="oil-card oil-motor">
                  🛢️ <strong>Cambio de Aceite de Motor Realizado</strong><br>
                  • Especificación/Aceite: ${serv.tipo_aceite_motor || 'N/A'}<br>
                  • Próximo cambio en: <strong>${serv.proximo_km_motor || 'N/A'} KM</strong>
                </div>
              ` : ''}

              ${serv.cambio_aceite_caja ? `
                <div class="oil-card oil-caja">
                  ⚙️ <strong>Cambio de Aceite de Caja / Transmisión Realizado</strong><br>
                  • Especificación: ${serv.tipo_aceite_caja || 'N/A'}<br>
                  • Próximo cambio en: <strong>${serv.proximo_km_caja || 'N/A'} KM</strong>
                </div>
              ` : ''}

              ${serv.proxima_fecha ? `
                <div class="next-date">
                  🗓️ Próxima visita recomendada: ${serv.proxima_fecha}
                </div>
              ` : ''}
            </div>
          `;
        });
      } else {
        serviciosHtml = '<p style="font-size: 0.85rem; color: #94a3b8; font-style: italic; margin-top: 10px;">Sin mantenimientos registrados aún.</p>';
      }

      const cardHtml = `
        <div class="car-card">
          <div class="car-header">
            <h3>🚘 ${car.marca} ${car.linea || ''} (${car.modelo})</h3>
            <span>Placa: ${car.placa} | Color: ${car.color}</span>
          </div>
          <h4 style="margin: 0; color: #475569; font-size: 0.9rem;">Historial Clínico de Fichas Técnicas:</h4>
          ${serviciosHtml}
        </div>
      `;

      container.innerHTML += cardHtml;
    }

  } catch (err) {
    console.error('Error al cargar la información:', err);
    container.innerHTML = '<p style="color:#ef4444;">Error de comunicación con el servidor.</p>';
  }
}