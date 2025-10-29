export function exportToCSV(
  rows: Record<string, any>[],
  fields: string[],
  filename: string = "ai-query-results.csv"
) {
  if (!rows || rows.length === 0) {
    throw new Error("No data to export");
  }

  // Build CSV header
  const header = fields.join(",");
  
  // Build CSV rows with proper escaping
  const csvRows = rows.map(row => {
    return fields.map(field => {
      const value = row[field];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return "";
      }
      
      // Convert to string and escape
      const str = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      
      return str;
    }).join(",");
  });
  
  const csv = [header, ...csvRows].join("\n");
  
  // Create download link
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
