// components/ProgressBar.js

import React from 'react';

const ProgressBar = ({ start, current, target, isdisplay }) => {
  const percentage = parseFloat(
    (((current - start) / (target - start)) * 100).toFixed(2),
  );

  return (
    <div className="w-full max-w-full text-xs bg-gray-600 rounded-full">
      <div
        className="bg-purple-500 leading-none py-1 text-center text-white rounded-full max-w-full"
        style={{ width: `${percentage}%` }}
      >
        {isdisplay && <div>{percentage}%</div>}
      </div>
    </div>
  );
};

export default ProgressBar;
