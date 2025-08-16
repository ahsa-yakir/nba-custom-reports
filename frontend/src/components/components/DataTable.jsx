import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { formatTableValue, getValueForColumn } from '../utils/dataFormatting';

const DataTable = ({ data, columns, sortConfig, onSort }) => {
  const getSortIcon = (column) => {
    if (sortConfig.column !== column) {
      return <div className="w-4 h-4"></div>;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map(column => (
              <th 
                key={column} 
                className={`text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 select-none ${
                  sortConfig.column === column ? 'bg-blue-50 text-blue-700' : ''
                }`}
                onClick={() => onSort(column)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column}</span>
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-b hover:bg-gray-50">
              {columns.map(column => (
                <td key={column} className="py-3 px-4">
                  {formatTableValue(getValueForColumn(item, column), column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;