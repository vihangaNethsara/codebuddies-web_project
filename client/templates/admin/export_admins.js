import { Meteor } from "meteor/meteor";

// Call this function to trigger CSV download
export function downloadAdminsCSV() {
  Meteor.call("exportAdminsToCSV", (err, csv) => {
    if (err) {
      alert("Error exporting admins: " + err.reason);
      return;
    }
    // Create a blob and download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admins.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
