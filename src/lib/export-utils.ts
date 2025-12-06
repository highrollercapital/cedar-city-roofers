/**
 * Data Export Utilities
 * 
 * Functions to export data to CSV and PDF formats
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Export leads to CSV
export const exportLeadsToCSV = (leads: any[]): void => {
  const headers = ['Name', 'Email', 'Phone', 'Address', 'Roof Type', 'Status', 'Urgency', 'Created'];
  const rows = leads.map((lead) => [
    lead.name,
    lead.email,
    lead.phone,
    lead.address || '',
    lead.roof_type || '',
    lead.status,
    lead.urgency,
    new Date(lead.created_at).toLocaleDateString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export projects to CSV
export const exportProjectsToCSV = (projects: any[]): void => {
  const headers = [
    'Name',
    'Address',
    'Stage',
    'Estimated Cost',
    'Actual Cost',
    'Start Date',
    'Completion Date',
  ];
  const rows = projects.map((project) => [
    project.name,
    project.address,
    project.stage,
    project.estimated_cost ? `$${Number(project.estimated_cost).toLocaleString()}` : '',
    project.actual_cost ? `$${Number(project.actual_cost).toLocaleString()}` : '',
    project.start_date ? new Date(project.start_date).toLocaleDateString() : '',
    project.completion_date ? new Date(project.completion_date).toLocaleDateString() : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `projects_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export revenue report to PDF
export const exportRevenueReportToPDF = (revenueData: any): void => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Revenue Report', 14, 22);
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Summary Stats
  doc.setFontSize(12);
  doc.text('Summary', 14, 40);
  
  const summaryData = [
    ['Total Revenue', `$${(revenueData.totalRevenue || 0).toLocaleString()}`],
    ['This Month', `$${(revenueData.thisMonthRevenue || 0).toLocaleString()}`],
    ['Completed Projects', (revenueData.completedProjects || 0).toString()],
    ['In Progress', (revenueData.inProgressProjects || 0).toString()],
  ];
  
  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
  });
  
  // Monthly Revenue Table
  if (revenueData.chartData && revenueData.chartData.length > 0) {
    doc.setFontSize(12);
    doc.text('Monthly Revenue', 14, doc.lastAutoTable.finalY + 15);
    
    const monthlyData = revenueData.chartData.map((item: any) => [
      item.month,
      `$${(item.revenue || 0).toLocaleString()}`,
      (item.projects || 0).toString(),
    ]);
    
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Month', 'Revenue', 'Projects']],
      body: monthlyData,
      theme: 'striped',
    });
  }
  
  doc.save(`revenue_report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export proposal to PDF
export const exportProposalToPDF = (proposal: any): void => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(proposal.title || 'Proposal', 14, 22);
  
  // Proposal Details
  doc.setFontSize(10);
  let yPos = 35;
  
  if (proposal.description) {
    doc.setFontSize(12);
    doc.text('Description', 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    const descriptionLines = doc.splitTextToSize(proposal.description, 180);
    doc.text(descriptionLines, 14, yPos);
    yPos += descriptionLines.length * 5 + 5;
  }
  
  // Items Table
  if (proposal.items && Array.isArray(proposal.items)) {
    doc.setFontSize(12);
    doc.text('Items', 14, yPos);
    yPos += 7;
    
    const itemsData = proposal.items.map((item: any) => [
      item.description || '',
      (item.quantity || 0).toString(),
      `$${(item.price || 0).toLocaleString()}`,
      `$${((item.quantity || 0) * (item.price || 0)).toLocaleString()}`,
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Quantity', 'Price', 'Total']],
      body: itemsData,
      theme: 'striped',
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
  }
  
  // Totals
  if (proposal.subtotal || proposal.tax || proposal.total) {
    doc.setFontSize(12);
    doc.text('Totals', 14, yPos);
    yPos += 7;
    
    const totalsData = [];
    if (proposal.subtotal) {
      totalsData.push(['Subtotal', `$${Number(proposal.subtotal).toLocaleString()}`]);
    }
    if (proposal.tax) {
      totalsData.push(['Tax', `$${Number(proposal.tax).toLocaleString()}`]);
    }
    if (proposal.total) {
      totalsData.push(['Total', `$${Number(proposal.total).toLocaleString()}`]);
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Amount']],
      body: totalsData,
      theme: 'striped',
    });
  }
  
  doc.save(`proposal_${proposal.id}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export appointments to CSV
export const exportAppointmentsToCSV = (appointments: any[]): void => {
  const headers = ['Title', 'Start Time', 'End Time', 'Location', 'Status', 'Client'];
  const rows = appointments.map((apt) => [
    apt.title,
    new Date(apt.start_time).toLocaleString(),
    new Date(apt.end_time).toLocaleString(),
    apt.location || '',
    apt.status,
    apt.client_id ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `appointments_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

