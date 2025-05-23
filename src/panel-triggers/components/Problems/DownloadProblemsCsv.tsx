import React from 'react';
import { ProblemDTO, ZBXAcknowledge } from '../../../datasource/types';
import { getAppEvents } from '@grafana/runtime';
import { Button } from '@grafana/ui';

interface DownloadProblemsCsvProps {
  problemsToRender: ProblemDTO[];
}

export const DownloadProblemsCsv: React.FC<DownloadProblemsCsvProps> = ({ problemsToRender }) => {
  const handleDownloadCsv = () => {
    if (!problemsToRender || problemsToRender.length === 0) {
      // @ts-ignore
      getAppEvents().emit('alert-warning', ['No Data', 'There is no data to export.']);
      return;
    }

    // Severity mapping
    const severityMap = {
      0: 'Not classified',
      1: 'Information',
      2: 'Warning',
      3: 'Average',
      4: 'High',
      5: 'Disaster',
    };

    // New headers to match Zabbix format
    const headers = [
      'Severity',
      'Time',
      'Recovery time',
      'Status',
      'Host',
      'Problem',
      'Duration',
      'Ack',
      'Actions',
      'Tags',
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const problem of problemsToRender) {
      // Format timestamp to readable date
      const formatTimestamp = (timestamp: number) => {
        if (!timestamp) {
          return '';
        }
        const date = new Date(timestamp * 1000); // Convert Unix timestamp to JS Date
        return date.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        });
      };

      let status;
      if (problem.value === '0') {
        status = 'RESOLVED';
      } else {
        status = 'PROBLEM';
      }

      // şimdilik iptal ediyorum
      // if (problem.manual_close === '1' && problem.value !== '0') {
      //   status = 'RESOLVED';
      // }

      // Format acknowledges for Actions column
      let actions = '';
      if (Array.isArray(problem.acknowledges) && problem.acknowledges.length > 0) {
        const messageCount = problem.acknowledges.filter((ack) => ack.message && ack.message.trim() !== '').length;
        if (messageCount > 0) {
          actions += `Messages (${messageCount}), `;
        }
        actions += `Actions (${problem.acknowledges.length})`;
        actions = actions.replace(/, $/, '');
      }

      // Format tags
      let tagsFormatted = '';
      if (Array.isArray(problem.tags) && problem.tags.length > 0) {
        tagsFormatted = problem.tags.map((tag) => `${tag.tag}: ${tag.value}`).join(', ');
      }

      // Determine Ack status
      const ack = problem.acknowledged === '1' ? 'Yes' : 'No';

      // Map severity number to text
      const severityText = severityMap[problem.severity] || `Unknown (${problem.severity})`;

      // Format values for each row
      const values = [
        severityText, // Severity text instead of number
        formatTimestamp(problem.timestamp), // Time
        problem.r_eventid ? formatTimestamp(problem.r_timestamp) : '', // Recovery time
        status, // Status
        problem.host, // Host
        problem.name, // Problem
        problem.duration || '', // Duration
        ack, // Ack
        actions, // Actions
        tagsFormatted, // Tags
      ];

      // Format CSV string
      const formattedValues = values.map((value) => {
        if (value === null || value === undefined) {
          return '';
        }

        let stringValue = String(value);
        stringValue = stringValue.replace(/"/g, '""');

        if (stringValue.includes(',')) {
          return `"${stringValue}"`;
        }

        return stringValue;
      });

      csvRows.push(formattedValues.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'problems.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      // @ts-ignore
      getAppEvents().emit('alert-success', ['CSV Downloaded', 'The problems data has been downloaded.']);
    } else {
      // @ts-ignore
      getAppEvents().emit('alert-error', ['Download Error', 'CSV download is not supported by your browser.']);
    }
  };

  return (
    <Button
      icon="download-alt"
      onClick={handleDownloadCsv}
      disabled={!problemsToRender || problemsToRender.length === 0}
      style={{ marginBottom: '10px' }}
    >
      Download CSV
    </Button>
  );
};
