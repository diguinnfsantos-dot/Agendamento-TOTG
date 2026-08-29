// Google Sheets API Client Service (using standard REST v4)
import { Appointment } from '../types';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export class GoogleSheetsService {
  /**
   * Create a new Google Spreadsheet for appointments
   */
  static async createAppointmentsSheet(
    accessToken: string,
    title = `Agendamentos Clínica Rsantos - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`
  ): Promise<SpreadsheetInfo> {
    try {
      const body = {
        properties: {
          title: title,
        },
        sheets: [
          {
            properties: {
              title: 'Agendamentos',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      };

      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Erro ao criar Planilha Google');
      }

      const data = await res.json();
      const spreadsheetId = data.spreadsheetId;
      const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // Populate header row with stylized columns
      const headers = [
        'ID / Protocolo',
        'Data Consulta',
        'Horário',
        'Paciente',
        'CPF',
        'Cartão SUS',
        'Telefone / WhatsApp',
        'Especialidade',
        'Médico / Profissional',
        'ID Posto',
        'Posto de Origem',
        'Operador Emissor',
        'Status',
        'Data Registro',
        'Motivo Cancelamento',
      ];

      await this.appendRows(accessToken, spreadsheetId, 'Agendamentos!A1:O1', [headers]);

      return {
        spreadsheetId,
        spreadsheetUrl,
        title,
      };
    } catch (error: any) {
      console.error('Sheets createAppointmentsSheet failed:', error);
      throw error;
    }
  }

  /**
   * Export all appointments to a Google Spreadsheet
   */
  static async syncAppointmentsToSheet(
    accessToken: string,
    spreadsheetId: string,
    appointments: Appointment[]
  ): Promise<{ rowCount: number }> {
    try {
      const rows = appointments.map((app) => [
        app.id,
        app.data,
        app.horario,
        app.paciente.paciente,
        app.paciente.cpf,
        app.paciente.sus || '-',
        app.paciente.tel,
        app.especialidade,
        app.medico || 'A Definir',
        app.postoId,
        app.origem,
        app.operadorNome,
        app.status === 'CONFIRMED' 
          ? 'Confirmado' 
          : app.status === 'CANCEL_REQUESTED' 
            ? 'Cancelamento Solicitado' 
            : 'Cancelado',
        new Date(app.criadoEm).toLocaleString('pt-BR'),
        app.motivoCancelamento || '',
      ]);

      // Clear existing data rows (keep header)
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Agendamentos!A2:O1000:clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (rows.length > 0) {
        await this.appendRows(accessToken, spreadsheetId, 'Agendamentos!A2', rows);
      }

      return { rowCount: rows.length };
    } catch (error: any) {
      console.error('Sheets syncAppointmentsToSheet failed:', error);
      throw error;
    }
  }

  /**
   * Append rows to a specific range in the spreadsheet
   */
  static async appendRows(
    accessToken: string,
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<any> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Erro ao gravar linhas na Planilha Google');
    }

    return await res.json();
  }

  /**
   * Read rows from spreadsheet
   */
  static async readSheet(
    accessToken: string,
    spreadsheetId: string,
    range = 'Agendamentos!A1:O100'
  ): Promise<any[][]> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Erro ao ler dados da Planilha Google');
    }

    const data = await res.json();
    return data.values || [];
  }
}
