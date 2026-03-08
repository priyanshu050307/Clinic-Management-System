/**
 * CMS - Prescription Management
 * Doctor writes prescription; stored in sheet; patient views read-only.
 */

/**
 * Save prescription for an appointment (doctor only).
 */
function savePrescription(sessionToken, appointmentId, content) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Doctor') return { error: 'Unauthorized' };
  if (!appointmentId || content == null) return { error: 'Appointment and content required.' };
  var ss = getSpreadsheet();
  var apptSh = ss.getSheetByName('Appointments');
  var prescSh = ss.getSheetByName('Prescriptions');
  if (!apptSh || !prescSh) return { error: 'Sheets not found' };
  var apptData = apptSh.getDataRange().getValues();
  var apptH = apptData[0];
  var idIdx = apptH.indexOf('AppointmentId');
  var docIdx = apptH.indexOf('DoctorUserId');
  var patientIdx = apptH.indexOf('PatientUserId');
  var appointment = null;
  for (var i = 1; i < apptData.length; i++) {
    if (apptData[i][idIdx] === appointmentId) {
      if (apptData[i][docIdx] !== session.userId) return { error: 'Not your appointment.' };
      appointment = apptData[i];
      break;
    }
  }
  if (!appointment) return { error: 'Appointment not found.' };
  var prescriptionId = generateId();
  var row = [
    prescriptionId,
    appointmentId,
    appointment[patientIdx],
    session.userId,
    content.toString(),
    new Date().toISOString()
  ];
  prescSh.appendRow(row);
  // If there is also a bill for this appointment, mark it as completed
  if (typeof maybeCompleteAppointment === 'function') {
    maybeCompleteAppointment(appointmentId);
  }
  return { success: true, prescriptionId: prescriptionId };
}

/**
 * Get prescriptions for an appointment (doctor/patient read).
 */
function getPrescriptionsForAppointment(sessionToken, appointmentId) {
  var session = getSessionFromToken(sessionToken);
  if (!session) return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName('Prescriptions');
  if (!sh) return { error: 'Sheet not found' };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var apptIdx = headers.indexOf('AppointmentId');
  var patientIdx = headers.indexOf('PatientUserId');
  var doctorIdx = headers.indexOf('DoctorUserId');
  var contentIdx = headers.indexOf('Content');
  var createdIdx = headers.indexOf('CreatedAt');
  var prescIdIdx = headers.indexOf('PrescriptionId');
  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][apptIdx] !== appointmentId) continue;
    if (session.role === 'Patient' && data[i][patientIdx] !== session.userId) continue;
    if (session.role === 'Doctor' && data[i][doctorIdx] !== session.userId) continue;
    list.push({
      prescriptionId: data[i][prescIdIdx],
      content: data[i][contentIdx],
      createdAt: data[i][createdIdx]
    });
  }
  return { prescriptions: list };
}

/**
 * Get all prescriptions for current patient (patient view).
 */
function getMyPrescriptions(sessionToken) {
  var session = getSessionFromToken(sessionToken);
  if (!session || session.role !== 'Patient') return { error: 'Unauthorized' };
  var ss = getSpreadsheet();
  var prescSh = ss.getSheetByName('Prescriptions');
  var apptSh = ss.getSheetByName('Appointments');
  var userSh = ss.getSheetByName('Users');
  if (!prescSh || !apptSh || !userSh) return { error: 'Sheets not found' };
  var prescData = prescSh.getDataRange().getValues();
  var apptData = apptSh.getDataRange().getValues();
  var userData = userSh.getDataRange().getValues();
  var prescH = prescData[0];
  var apptH = apptData[0];
  var userH = userData[0];
  var patientIdx = prescH.indexOf('PatientUserId');
  var apptIdIdx = prescH.indexOf('AppointmentId');
  var contentIdx = prescH.indexOf('Content');
  var createdIdx = prescH.indexOf('CreatedAt');
  var slotStartIdx = apptH.indexOf('SlotStart');
  var doctorIdx = apptH.indexOf('DoctorUserId');
  var nameIdx = userH.indexOf('Name');
  var uidIdx = userH.indexOf('UserId');
  var list = [];
  for (var i = 1; i < prescData.length; i++) {
    if (prescData[i][patientIdx] !== session.userId) continue;
    var apptId = prescData[i][apptIdIdx];
    var slotStart = '';
    var doctorName = '';
    for (var a = 1; a < apptData.length; a++) {
      if (apptData[a][apptH.indexOf('AppointmentId')] === apptId) {
        slotStart = apptData[a][slotStartIdx];
        var docUid = apptData[a][doctorIdx];
        for (var u = 1; u < userData.length; u++) {
          if (userData[u][uidIdx] === docUid) { doctorName = userData[u][nameIdx] || ''; break; }
        }
        break;
      }
    }
    list.push({
      prescriptionId: prescData[i][prescH.indexOf('PrescriptionId')],
      appointmentId: apptId,
      content: prescData[i][contentIdx],
      createdAt: prescData[i][createdIdx],
      slotStart: slotStart,
      doctorName: doctorName
    });
  }
  list.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
  return { prescriptions: list };
}
