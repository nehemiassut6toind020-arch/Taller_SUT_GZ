document.addEventListener('DOMContentLoaded', async () => {
  // 1. Validar sesión de usuario
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const userId = session.user.id;

  // 2. Obtener datos del perfil
  const { data: profile, error: profileErr } = await supabaseClient
    .from('profiles')
    .select('nombre_completo')
    .eq('id', userId)
    .single();

  if (profileErr) {
    console.error('Error al consultar perfil:', profileErr);
  }

  if (profile && profile.nombre_completo) {
    const userElem = document.getElementById('userName');
    if (userElem) userElem.innerText = profile.nombre_completo;
  }

  // 3. Cargar vehículos e historial
  await cargarVehiculosYServicios(userId);

  // 4. Evento para cerrar sesión
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
  }
});

async function cargarVehiculosYServicios(userId) {
  const container = document.getElementById('vehiculosContainer');
  if (!container) return;

  try {
    // Intento 1: Traer vehículos y sus servicios anidados usando 'id_propietario'
    let res = await supabaseClient
      .from('vehiculos')
      .select('*, servicios(*)')
      .eq('id_propietario', userId);

    // Intento 2: Si falla con 400 por nombre de columna, probar 'propietario_id'
    if (res.error) {
      console.warn('Falló id_propietario, reintentando con propietario_id...', res.error);
      res = await supabaseClient
        .from('vehiculos')
        .select('*, servicios(*)')
        .eq('propietario_id', userId);
    }

    if (res.error) {
      console.error('Error definitivo de Supabase:', res.error);
      throw res.error;
    }

    const vehiculos = res.data;

    if (!vehiculos || vehiculos.length === 0) {
      container.innerHTML = '<p style="color: #64748b;">No tienes vehículos registrados en el taller.</p>';
      return;
    }

    container.innerHTML = '';

    // Renderizado estructurado
    vehiculos.forEach(car => {
      // Ordenar servicios del más reciente al más antiguo
      const servicios = (car.servicios || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      let serviciosHtml = '';

      if (servicios.length > 0) {
        servicios.forEach(serv => {
          const fecha = new Date(serv.created_at).toLocaleDateString('es-GT', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          serviciosHtml += `
            <div class="service-box">
              <div class="service-title">
                <span>${serv.tipo_servicio || 'Mantenimiento General'}</span>
                <span style="color: #64748b; font-weight: normal; font-size: 0.85rem;">${fecha}</span>
              </div>
              <div style="font-size: 0.88rem; margin-bottom: 5px;">
                <strong>Kilometraje Registrado:</strong> ${serv.km_actual || 'N/A'} KM
              </div>
              <div class="details-text">
                <strong>Trabajos Realizados / Diagnóstico:</strong><br>
                ${serv.detalles_trabajo || 'Sin observaciones adicionales.'}
              </div>
              ${serv.cambio_aceite_motor ? `
                <div class="oil-card oil-motor">
                  <strong>Cambio de Aceite de Motor Realizado</strong><br>
                  • Especificación/Aceite: ${serv.tipo_aceite_motor || 'N/A'}<br>
                  • Próximo cambio en: <strong>${serv.proximo_km_motor || 'N/A'} KM</strong>
                </div>
              ` : ''}
              ${serv.cambio_aceite_caja ? `
                <div class="oil-card oil-caja">
                  <strong>Cambio de Aceite de Caja / Transmisión Realizado</strong><br>
                  • Especificación: ${serv.tipo_aceite_caja || 'N/A'}<br>
                  • Próximo cambio en: <strong>${serv.proximo_km_caja || 'N/A'} KM</strong>
                </div>
              ` : ''}
              ${serv.proxima_fecha ? `
                <div class="next-date">
                  Próxima visita recomendada: ${serv.proxima_fecha}
                </div>
              ` : ''}
            </div>
          `;
        });
      } else {
        serviciosHtml = '<p style="font-size: 0.85rem; color: #94a3b8; font-style: italic; margin-top: 10px;">Sin mantenimientos registrados aún.</p>';
      }

      container.innerHTML += `
        <div class="car-card">
          <div class="car-header">
            <h3>${car.marca} ${car.linea || ''} (${car.modelo})</h3>
            <span>Placa: ${car.placa} | Color: ${car.color}</span>
          </div>
          <h4 style="margin: 0; color: #475569; font-size: 0.9rem;">Historial Clínico de Fichas Técnicas:</h4>
          ${serviciosHtml}
        </div>
      `;
    });
  } catch (err) {
    console.error('Error capturado en la ejecución:', err);
    container.innerHTML = '<p style="color:#ef4444;">Error de comunicación con el servidor. Revisa la consola para más detalles.</p>';
  }
}