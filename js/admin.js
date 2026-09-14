let clientesGlobal = [];
let vehiculosGlobal = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Validar sesión de Administrador
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { 
    window.location.href = 'index.html'; 
    return; 
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.rol !== 'ADMIN') {
    alert('Acceso restringido.');
    window.location.href = 'dashboard.html';
    return;
  }

  // 2. Cargar datos
  await cargarClientes();
  await cargarVehiculos();

  // 3. Asignación de Eventos
  document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  });

  document.getElementById('formCliente').addEventListener('submit', guardarCliente);
  document.getElementById('btnCancelarEditCliente').addEventListener('click', limpiarFormCliente);
  document.getElementById('formVehiculo').addEventListener('submit', guardarVehiculo);
  document.getElementById('btnCancelarEditVehiculo').addEventListener('click', limpiarFormVehiculo);
  document.getElementById('selectClienteServicio').addEventListener('change', filtrarVehiculosPorCliente);
  document.getElementById('tipoServicio').addEventListener('change', toggleOtroServicio);
  document.getElementById('chkAceiteMotor').addEventListener('change', toggleSeccionAceiteMotor);
  document.getElementById('chkAceiteCaja').addEventListener('change', toggleSeccionAceiteCaja);
  document.getElementById('formServicio').addEventListener('submit', registrarServicioYGenerarPDF);
});

/* CONTROLES DINÁMICOS */
function toggleOtroServicio(e) {
  const groupOtro = document.getElementById('groupOtroServicio');
  const inputOtro = document.getElementById('otroServicioTexto');
  if (e.target.value === 'OTRO') {
    groupOtro.style.display = 'flex';
    inputOtro.setAttribute('required', 'true');
  } else {
    groupOtro.style.display = 'none';
    inputOtro.removeAttribute('required');
    inputOtro.value = '';
  }
}

function toggleSeccionAceiteMotor(e) {
  const seccion = document.getElementById('seccionAceiteMotor');
  const tipoAceite = document.getElementById('tipoAceiteMotor');
  const proximoKm = document.getElementById('proximoKmMotor');
  if (e.target.checked) {
    seccion.style.display = 'block';
    tipoAceite.setAttribute('required', 'true');
    proximoKm.setAttribute('required', 'true');
  } else {
    seccion.style.display = 'none';
    tipoAceite.removeAttribute('required');
    proximoKm.removeAttribute('required');
    tipoAceite.value = '';
    proximoKm.value = '';
  }
}

function toggleSeccionAceiteCaja(e) {
  const seccion = document.getElementById('seccionAceiteCaja');
  const tipoAceite = document.getElementById('tipoAceiteCaja');
  const proximoKm = document.getElementById('proximoKmCaja');
  if (e.target.checked) {
    seccion.style.display = 'block';
    tipoAceite.setAttribute('required', 'true');
    proximoKm.setAttribute('required', 'true');
  } else {
    seccion.style.display = 'none';
    tipoAceite.removeAttribute('required');
    proximoKm.removeAttribute('required');
    tipoAceite.value = '';
    proximoKm.value = '';
  }
}

/* CRUD CLIENTES */
async function cargarClientes() {
  const { data: clientes, error } = await supabaseClient.from('profiles').select('*').order('nombre_completo');
  if (error) {
    console.error('Error al cargar clientes:', error);
    return;
  }

  clientesGlobal = clientes;
  const tabla = document.getElementById('tablaClientes');
  const selectProp = document.getElementById('selectPropietario');
  const selectClienteServ = document.getElementById('selectClienteServicio');

  if (tabla) {
    tabla.innerHTML = clientes.map(c => `
      <tr>
        <td>${c.nombre_completo || 'Sin Nombre'}</td>
        <td>${c.telefono || 'N/A'}</td>
        <td>${c.dpi || 'N/A'}</td>
        <td><strong>${c.rol}</strong></td>
        <td class="actions">
          <button class="btn-warning" onclick="prepararEdicionCliente('${c.id}')">Editar</button>
          ${c.rol !== 'ADMIN' ? `<button class="btn-danger" onclick="eliminarCliente('${c.id}')">Eliminar</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  const soloClientes = clientes.filter(c => c.rol === 'CLIENTE');
  const opcionesClientes = soloClientes.length === 0
    ? '<option value="">Sin clientes registrados</option>'
    : '<option value="">Seleccione cliente...</option>' +
      soloClientes.map(c => `<option value="${c.id}">${c.nombre_completo}</option>`).join('');

  if (selectProp) selectProp.innerHTML = opcionesClientes;
  if (selectClienteServ) selectClienteServ.innerHTML = opcionesClientes;
}

async function guardarCliente(e) {
  e.preventDefault();
  const editId = document.getElementById('editClienteId').value;
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const nombre_completo = document.getElementById('regNombre').value.trim();
  const telefono = document.getElementById('regTelefono').value.trim();
  const dpi = document.getElementById('regDpi').value.trim();

  if (editId) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({ nombre_completo, telefono, dpi })
      .eq('id', editId)
      .select();

    if (error) {
      alert('Error al actualizar cliente: ' + error.message);
      return;
    }
    alert('Cliente actualizado exitosamente.');
    limpiarFormCliente();
    await cargarClientes();
    await cargarVehiculos();
  } else {
    const { data, error } = await supabaseClient.rpc('admin_registrar_cliente', {
      p_email: email,
      p_password: password,
      p_nombre_completo: nombre_completo,
      p_telefono: telefono,
      p_dpi: dpi
    });

    if (error || (data && !data.success)) {
      alert('Error al registrar cliente: ' + (error ? error.message : (data ? data.error : 'Desconocido')));
    } else {
      alert('Cliente registrado exitosamente.');
      limpiarFormCliente();
      await cargarClientes();
    }
  }
}

function prepararEdicionCliente(id) {
  const cliente = clientesGlobal.find(c => c.id === id);
  if (!cliente) return;

  document.getElementById('editClienteId').value = cliente.id;
  document.getElementById('regNombre').value = cliente.nombre_completo || '';
  document.getElementById('regTelefono').value = cliente.telefono || '';
  document.getElementById('regDpi').value = cliente.dpi || '';

  const inputEmail = document.getElementById('regEmail');
  if (inputEmail) {
    inputEmail.value = 'cliente@existente.com';
    inputEmail.disabled = true;
    inputEmail.removeAttribute('required');
  }

  const passContainer = document.getElementById('passContainer');
  const inputPass = document.getElementById('regPassword');
  if (passContainer) passContainer.style.display = 'none';
  if (inputPass) inputPass.removeAttribute('required');

  document.getElementById('tituloFormCliente').innerText = 'Editar Cliente';
  document.getElementById('btnGuardarCliente').innerText = 'Actualizar Cliente';
  document.getElementById('btnCancelarEditCliente').style.display = 'inline-block';
}

function limpiarFormCliente() {
  document.getElementById('formCliente').reset();
  document.getElementById('editClienteId').value = '';

  const inputEmail = document.getElementById('regEmail');
  if (inputEmail) {
    inputEmail.disabled = false;
    inputEmail.setAttribute('required', 'true');
  }

  const passContainer = document.getElementById('passContainer');
  const inputPass = document.getElementById('regPassword');
  if (passContainer) passContainer.style.display = 'flex';
  if (inputPass) inputPass.setAttribute('required', 'true');

  document.getElementById('tituloFormCliente').innerText = 'Registrar Nuevo Cliente';
  document.getElementById('btnGuardarCliente').innerText = 'Crear Cuenta de Cliente';
  document.getElementById('btnCancelarEditCliente').style.display = 'none';
}

async function eliminarCliente(id) {
  if (!confirm('¿Seguro de eliminar este cliente? Se borrarán sus vehículos asociados.')) return;
  const { data, error } = await supabaseClient.rpc('admin_eliminar_cliente', { p_user_id: id });
  if (error || (data && !data.success)) {
    alert('Error al eliminar cliente.');
  } else {
    alert('Cliente eliminado.');
    await cargarClientes();
    await cargarVehiculos();
  }
}

/* CRUD VEHÍCULOS */
async function cargarVehiculos() {
  const { data: vehiculos, error } = await supabaseClient
    .from('vehiculos')
    .select('*, profiles(nombre_completo, telefono)');

  if (error) {
    console.error('Error al cargar vehículos:', error);
    return;
  }

  vehiculosGlobal = vehiculos;
  const tabla = document.getElementById('tablaVehiculos');

  if (tabla) {
    tabla.innerHTML = vehiculos.map(v => {
      const nombreCliente = v.profiles ? v.profiles.nombre_completo : 'N/A';
      const infoVehiculo = `${v.marca} ${v.linea || ''} (${v.modelo})`;
      return `
        <tr>
          <td>${nombreCliente}</td>
          <td>${infoVehiculo}</td>
          <td><strong>${v.placa}</strong></td>
          <td>${v.color}</td>
          <td class="actions">
            <button class="btn-success" onclick="notificarClienteListo('${v.id}')">Notificar</button>
            <button class="btn-warning" onclick="prepararEdicionVehiculo('${v.id}')">Editar</button>
            <button class="btn-danger" onclick="eliminarVehiculo('${v.id}')">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function filtrarVehiculosPorCliente() {
  const clientId = document.getElementById('selectClienteServicio').value;
  const selectVehServ = document.getElementById('selectVehiculoServicio');

  if (!clientId) {
    selectVehServ.innerHTML = '<option value="">Primero seleccione un cliente...</option>';
    selectVehServ.disabled = true;
    return;
  }

  const vehiculosCliente = vehiculosGlobal.filter(v => v.id_propietario === clientId);

  if (vehiculosCliente.length === 0) {
    selectVehServ.innerHTML = '<option value="">El cliente no tiene vehículos registrados</option>';
    selectVehServ.disabled = true;
  } else {
    selectVehServ.innerHTML = '<option value="">Seleccione vehículo...</option>' +
      vehiculosCliente.map(v => `<option value="${v.id}">${v.marca} ${v.linea || ''} - Placa: ${v.placa}</option>`).join('');
    selectVehServ.disabled = false;
  }
}

async function guardarVehiculo(e) {
  e.preventDefault();
  const editId = document.getElementById('editVehiculoId').value;
  const id_propietario = document.getElementById('selectPropietario').value;
  const marca = document.getElementById('marca').value.trim();
  const linea = document.getElementById('linea').value.trim();
  const modelo = parseInt(document.getElementById('modelo').value);
  const placa = document.getElementById('placa').value.trim();
  const color = document.getElementById('color').value.trim();

  if (editId) {
    const { error } = await supabaseClient
      .from('vehiculos')
      .update({ id_propietario, marca, linea, modelo, placa, color })
      .eq('id', editId);

    if (error) alert('Error: ' + error.message);
    else {
      alert('Vehículo actualizado');
      limpiarFormVehiculo();
      await cargarVehiculos();
    }
  } else {
    const { error } = await supabaseClient
      .from('vehiculos')
      .insert([{ id_propietario, marca, linea, modelo, placa, color }]);

    if (error) alert('Error: ' + error.message);
    else {
      alert('Vehículo guardado');
      limpiarFormVehiculo();
      await cargarVehiculos();
    }
  }
}

function prepararEdicionVehiculo(id) {
  const v = vehiculosGlobal.find(item => item.id === id);
  if (!v) return;

  document.getElementById('editVehiculoId').value = v.id;
  document.getElementById('selectPropietario').value = v.id_propietario;
  document.getElementById('marca').value = v.marca;
  document.getElementById('linea').value = v.linea || '';
  document.getElementById('modelo').value = v.modelo;
  document.getElementById('placa').value = v.placa;
  document.getElementById('color').value = v.color;

  document.getElementById('btnGuardarVehiculo').innerText = 'Actualizar Vehículo';
  document.getElementById('btnCancelarEditVehiculo').style.display = 'inline-block';
}

function limpiarFormVehiculo() {
  document.getElementById('formVehiculo').reset();
  document.getElementById('editVehiculoId').value = '';
  document.getElementById('btnGuardarVehiculo').innerText = 'Guardar Vehículo';
  document.getElementById('btnCancelarEditVehiculo').style.display = 'none';
}

async function eliminarVehiculo(id) {
  if (!confirm('¿Eliminar vehículo de la base de datos?')) return;
  const { error } = await supabaseClient.from('vehiculos').delete().eq('id', id);
  if (error) alert('Error: ' + error.message);
  else {
    alert('Vehículo eliminado');
    await cargarVehiculos();
  }
}

function notificarClienteListo(vehiculoId) {
  const v = vehiculosGlobal.find(item => item.id === vehiculoId);
  if (!v) return;

  const cliente = v.profiles;
  if (!cliente || !cliente.telefono || cliente.telefono.trim() === '' || cliente.telefono === 'N/A') {
    alert('El cliente no tiene un número telefónico válido registrado.');
    return;
  }

  let numLimpio = cliente.telefono.replace(/\D/g, '');
  if (numLimpio.length === 8) numLimpio = '502' + numLimpio;

  const vehiculoInfo = `${v.marca} ${v.linea || ''}`.trim();
  const mensaje = `Hola *${cliente.nombre_completo}*, le saludamos de *TALLER SUT GZ*.\n\nLe informamos que su vehículo *${vehiculoInfo}* (Placa: *${v.placa}*) ya se encuentra listo. Puede pasar a recogerlo cuando guste.\n\n¡Gracias por su preferencia!`;

  window.open(`https://wa.me/${numLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

/* REGISTRO DE SERVICIOS Y GENERACIÓN DE PDF */
async function registrarServicioYGenerarPDF(e) {
  e.preventDefault();
  const vehiculo_id = document.getElementById('selectVehiculoServicio').value;
  let tipo_servicio = document.getElementById('tipoServicio').value;
  if (tipo_servicio === 'OTRO') {
    tipo_servicio = document.getElementById('otroServicioTexto').value.trim();
  }

  const km_actual = parseInt(document.getElementById('kmActual').value);
  const costo_total = parseFloat(document.getElementById('costoTotal').value);
  const detalles_trabajo = document.getElementById('detallesTrabajo').value.trim();
  const proxima_fecha = document.getElementById('proximaFecha').value || null;

  // Aceite Motor
  const cambio_aceite_motor = document.getElementById('chkAceiteMotor').checked;
  const tipo_aceite_motor = cambio_aceite_motor ? document.getElementById('tipoAceiteMotor').value.trim() : null;
  const proximo_km_motor = cambio_aceite_motor ? parseInt(document.getElementById('proximoKmMotor').value) : null;

  // Aceite Caja
  const cambio_aceite_caja = document.getElementById('chkAceiteCaja').checked;
  const tipo_aceite_caja = cambio_aceite_caja ? document.getElementById('tipoAceiteCaja').value.trim() : null;
  const proximo_km_caja = cambio_aceite_caja ? parseInt(document.getElementById('proximoKmCaja').value) : null;

  if (!vehiculo_id) {
    alert('Debe seleccionar un vehículo válido.');
    return;
  }

  const payload = {
    vehiculo_id,
    tipo_servicio,
    km_actual,
    costo_total,
    detalles_trabajo,
    proxima_fecha,
    cambio_aceite_motor,
    tipo_aceite_motor,
    proximo_km_motor,
    cambio_aceite_caja,
    tipo_aceite_caja,
    proximo_km_caja
  };

  const { data, error } = await supabaseClient
    .from('servicios')
    .insert([payload])
    .select('*, vehiculos(*, profiles(*))')
    .single();

  if (error) {
    alert('Error al guardar registro de servicio: ' + error.message);
    return;
  }

  alert('Servicio registrado exitosamente. Generando Ficha Técnica en PDF...');
  generarPDF(data);

  document.getElementById('formServicio').reset();
  document.getElementById('selectVehiculoServicio').disabled = true;
  document.getElementById('seccionAceiteMotor').style.display = 'none';
  document.getElementById('seccionAceiteCaja').style.display = 'none';
  document.getElementById('groupOtroServicio').style.display = 'none';
}

function generarPDF(servicio) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const v = servicio.vehiculos || {};
  const cliente = v.profiles || {};

  // Encabezado
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("TALLER SUT GZ", 14, 18);
  doc.setFontSize(10);
  doc.text("INFORME DE SERVICIO Y REGISTRO TÉCNICO", 14, 25);

  // Datos Cliente / Vehículo
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  const fechaServicio = servicio.created_at ? new Date(servicio.created_at).toLocaleDateString() : new Date().toLocaleDateString();

  doc.text(`Fecha: ${fechaServicio}`, 14, 40);
  doc.text(`Cliente: ${cliente.nombre_completo || 'N/A'}`, 14, 46);
  doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, 14, 52);

  doc.text(`Vehículo: ${v.marca || ''} ${v.linea || ''} (${v.modelo || ''})`, 110, 40);
  doc.text(`Placa: ${v.placa || 'N/A'}`, 110, 46);
  doc.text(`Color: ${v.color || 'N/A'}`, 110, 52);

  // Filas Tabla
  const filasTabla = [
    ['Tipo de Servicio Principal', servicio.tipo_servicio || 'Mantenimiento General'],
    ['Kilometraje al Ingreso', `${servicio.km_actual} KM`]
  ];

  if (servicio.cambio_aceite_motor) {
    filasTabla.push(['Aceite de Motor', `APLICADO (${servicio.tipo_aceite_motor || 'N/A'})`]);
    filasTabla.push(['Próx. Cambio Aceite Motor', `${servicio.proximo_km_motor || 'N/A'} KM`]);
  } else {
    filasTabla.push(['Aceite de Motor', 'NO APLICADO / NO REQUERIDO']);
  }

  if (servicio.cambio_aceite_caja) {
    filasTabla.push(['Aceite de Caja / Transmisión', `APLICADO (${servicio.tipo_aceite_caja || 'N/A'})`]);
    filasTabla.push(['Próx. Cambio Aceite Caja', `${servicio.proximo_km_caja || 'N/A'} KM`]);
  } else {
    filasTabla.push(['Aceite de Caja / Transmisión', 'NO APLICADO / NO REQUERIDO']);
  }

  if (servicio.proxima_fecha) {
    filasTabla.push(['Próxima Visita Recomendada', servicio.proxima_fecha]);
  }

  filasTabla.push(['Costo Total del Servicio', `Q ${parseFloat(servicio.costo_total).toFixed(2)}`]);

  doc.autoTable({
    startY: 60,
    head: [['Detalle del Parámetro / Trabajo', 'Especificación Técnica']],
    body: filasTabla,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199] }
  });

  const finalY = doc.lastAutoTable.finalY || 130;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Trabajos Realizados, Repuestos y Diagnóstico:", 14, finalY + 12);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const lineasDetalle = doc.splitTextToSize(servicio.detalles_trabajo || 'Sin observaciones.', 180);
  doc.text(lineasDetalle, 14, finalY + 18);

  doc.setFontSize(8);
  doc.text("Gracias por su preferencia. Taller SUT GZ - Control y Calidad Automotriz.", 14, 280);

  doc.save(`Ficha_Servicio_${v.placa || 'Vehiculo'}_${servicio.km_actual}KM.pdf`);
}