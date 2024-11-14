import React from 'react';
import './App.css';

function App() {
  const timetable = [
    { subject: '수학', day: '월', start: 9, end: 10 },
    { subject: '영어', day: '화', start: 10, end: 11 },
    { subject: '과학', day: '수', start: 11, end: 12 },
    { subject: '역사', day: '목', start: 12, end: 13 },
    { subject: '체육', day: '금', start: 13, end: 14 },
  ];

  const days = ['월', '화', '수', '목', '금'];
  const hours = Array.from({ length: 9 }, (_, i) => i + 9); // 9시부터 17시까지

  return (
    <div className="App">
      <h1>시간표</h1>
      <div className="timetable">
        <div className="timetable-header">
          <div className="cell header-cell"></div>
          {days.map(day => (
            <div key={day} className="cell header-cell">
              {day}
            </div>
          ))}
        </div>
        <div className="timetable-body">
          {hours.map(hour => (
            <div key={hour} className="row">
              <div className="cell time-cell">{hour}:00</div>
              {days.map(day => (
                <div key={day} className="cell">
                  {timetable
                    .filter(item => item.day === day && item.start === hour)
                    .map(item => (
                      <div key={item.subject} className="subject">
                        {item.subject}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
