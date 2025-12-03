// Validar campos del formulario
function validateAppointmentForm(body) {
  const errors = [];
  
  if (!body.name || body.name.trim().length === 0) {
    errors.push('El nombre es requerido');
  }
  
  if (!body.whatsapp || body.whatsapp.trim().length === 0) {
    errors.push('El WhatsApp es requerido');
  } else {
    // Solo números, al menos 10 dígitos
    const onlyNumbers = body.whatsapp.replace(/\D/g, '');
    if (onlyNumbers.length < 10) {
      errors.push('El WhatsApp debe tener al menos 10 dígitos');
    }
  }
  
  if (!body.carModel || body.carModel.trim().length === 0) {
    errors.push('El modelo del vehículo es requerido');
  }
  
  if (!body.description || body.description.trim().length === 0) {
    errors.push('Debes seleccionar un tipo de servicio');
  }
  
  if (!body.date || body.date.trim().length === 0) {
    errors.push('La fecha es requerida');
  } else {
    // Validar que la fecha sea en el futuro
    const selectedDate = new Date(body.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      errors.push('La fecha no puede ser en el pasado');
    }
  }
  
  if (!body.time || body.time.trim().length === 0) {
    errors.push('La hora es requerida');
  }
  
  return errors;
}

// Mostrar mensaje de estado
function showAppointmentMessage(message, isSuccess = true) {
  const msg = document.getElementById('cita-msg');
  msg.textContent = message;
  msg.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da';
  msg.style.color = isSuccess ? '#155724' : '#721c24';
  msg.style.padding = '1rem';
  msg.style.borderRadius = '6px';
  msg.style.marginTop = '1rem';
  msg.style.fontWeight = '500';
}

// Manejar envío de cita
document.getElementById('form-cita').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button');
  btn.disabled = true;
  
  try {
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    
    // Validar en cliente
    const errors = validateAppointmentForm(body);
    if (errors.length > 0) {
      showAppointmentMessage(`❌ ${errors.join('\n')}`);
      btn.disabled = false;
      return;
    }
    
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    
    if (data.ok) {
      showAppointmentMessage('✓ ¡Cita agendada exitosamente! El administrador se contactará vía WhatsApp en breve.', true);
      form.reset();
    } else {
      const errorMsg = data.details ? data.details.join('\n') : data.error || 'Error desconocido';
      showAppointmentMessage(`✗ ${errorMsg}`);
    }
  } catch (err) {
    console.error('Error:', err);
    showAppointmentMessage('✗ Error de conexión. Verifica tu internet e intenta de nuevo.');
  } finally {
    btn.disabled = false;
  }
});
