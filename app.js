import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

const days = ["월", "화", "수", "목", "금"];
const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9시부터 18시까지

const periodToHour = {
  "1": "9",
  "2": "10",
  "3": "11",
  "4": "12",
  "5": "13",
  "6": "14",
  "7": "15",
  "8": "16",
  "9": "17",
  "10": "18",
};

const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"];

function App() {
  const [schedule, setSchedule] = useState([]);
  const [lecturesFromFile, setLecturesFromFile] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(""); // 학기 선택 상태

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = jsonData.map((row) => ({
        name: row['name'],
        location: row['location'],
        semester: row['semester'], // 학기 정보 추가
        times: row['times'] ? JSON.parse(row['times'].replace(/'/g, '"')) : [],
      }));

      setLecturesFromFile(formattedData);
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredLectures = lecturesFromFile.filter(
    (lecture) => lecture.semester === selectedSemester
  );

  const addSelectedLecture = () => {
    if (selectedLecture) {
      const lecturesToAdd = selectedLecture.times.map((time) => {
        const [day, period] = time.trim().split(/(?=\d)/);
        const hour = periodToHour[period];
        return {
          name: selectedLecture.name,
          location: selectedLecture.location,
          day,
          time: hour,
        };
      });

      // 중복 검사
      const isConflict = lecturesToAdd.some((lectureToAdd) =>
        schedule.some(
          (existingLecture) =>
            existingLecture.day === lectureToAdd.day && existingLecture.time === lectureToAdd.time
        )
      );

      if (isConflict) {
        alert("이미 추가된 시간과 겹칩니다.");
        return;
      }

      setSchedule((prevSchedule) => [...prevSchedule, ...lecturesToAdd]);
      setSelectedLecture(null);
    } else {
      alert("강의를 선택해주세요.");
    }
  };

  const removeLecture = (lectureName) => {
    setSchedule((prevSchedule) =>
      prevSchedule.filter((lecture) => lecture.name !== lectureName)
    );
  };

  return (
    <div className="App">
      <h1>시간표</h1>

      {/* 학기 선택 */}
      <div className="semester-select">
        <select
          onChange={(e) => setSelectedSemester(e.target.value)}
          value={selectedSemester}
        >
          <option value="">학기를 선택하세요</option>
          {semesters.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </div>

      {/* 파일 업로드 */}
      <div className="file-upload">
        <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
      </div>

      {/* 강의 선택 */}
      <div className="lecture-select">
        <select
          onChange={(e) => setSelectedLecture(JSON.parse(e.target.value))}
          value={JSON.stringify(selectedLecture) || ""}
        >
          <option value="">강의를 선택하세요</option>
          {filteredLectures.map((lecture, index) => (
            <option key={index} value={JSON.stringify(lecture)}>
              {lecture.name} - {lecture.location}
            </option>
          ))}
        </select>
        <button onClick={addSelectedLecture} disabled={!selectedLecture}>
          강의 추가
        </button>
      </div>

      {/* 시간표 */}
      <div className="timetable">
        <div className="time-column">
          <h2>시간</h2>
          {hours.map((hour) => (
            <div key={hour} className="hour-cell">
              {hour}:00
            </div>
          ))}
        </div>
        {days.map((day) => (
          <div key={day} className="day-column">
            <h2>{day}</h2>
            {hours.map((hour) => {
              const lecture = schedule.find(
                (lec) => lec.day === day && lec.time === String(hour)
              );
              return (
                <div key={hour} className="hour-cell">
                  {lecture ? (
                    <div className="lecture-box">
                      <div className="lecture-name">{lecture.name}</div>
                      <div className="lecture-location">{lecture.location}</div>
                      <button
                        className="remove-button"
                        onClick={() => removeLecture(lecture.name)}
                      >
                        X
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
