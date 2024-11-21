import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"];

const Modal = ({ isOpen, timetables, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          닫기
        </button>
        <h2>생성된 시간표</h2>
        {timetables.map((schedule, index) => (
          <div key={index} className="timetable">
            <h3>시간표 {index + 1}</h3>
            {schedule.map((lecture, i) => (
              <div key={i} className="lecture-box">
                <strong>{lecture.name}</strong>
                <p>장소: {lecture.location}</p>
                <p>교수: {lecture.professor}</p>
                {lecture.parsedTimes.map((time, idx) => (
                  <p key={idx}>
                    {time.day}요일, {time.period}:00
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [lecturesFromFile, setLecturesFromFile] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [fileReadComplete, setFileReadComplete] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allTimetables, setAllTimetables] = useState([]);
  const [preferredProfessor, setPreferredProfessor] = useState("");

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
        professor: row['professor'] || "",
        semester: row['semester'],
        times: row['times'] ? row['times'] : [],
      }));

      setLecturesFromFile(formattedData);
      setFileReadComplete(true);
    };

    reader.readAsArrayBuffer(file);
  };

  const parseTimes = (timesStr) => {
    if (!timesStr) return [];
    try {
      const times = JSON.parse(timesStr.replace(/'/g, '"'));
      return times.map((time) => {
        const day = time[0];
        const period = time.slice(1);
        return { day, period };
      });
    } catch {
      return [];
    }
  };

  const filterLectures = (lectures, semester) => {
    const seen = new Set();
    return lectures
      .filter((lecture) => lecture.semester === semester)
      .map((lecture) => ({
        ...lecture,
        parsedTimes: parseTimes(lecture.times),
      }))
      .filter((lecture) => {
        const uniqueKey = `${lecture.name}-${lecture.times}`;
        if (seen.has(uniqueKey)) {
          return false;
        }
        seen.add(uniqueKey);
        return true;
      });
  };

  const hasConflict = (existingSchedule, newLecture) => {
    return newLecture.parsedTimes.some((newTime) =>
      existingSchedule.some((scheduled) =>
        scheduled.parsedTimes.some(
          (scheduledTime) =>
            scheduledTime.day === newTime.day &&
            scheduledTime.period === newTime.period
        )
      )
    );
  };

  const generateValidTimetables = (lectures) => {
    const results = [];

    const backtrack = (currentSchedule, includedNames, index) => {
      if (index === lectures.length) {
        if (
          includedNames.size ===
          new Set(lectures.map((lecture) => lecture.name)).size
        ) {
          results.push([...currentSchedule]);
        }
        return;
      }

      const lecture = lectures[index];

      if (!includedNames.has(lecture.name) && !hasConflict(currentSchedule, lecture)) {
        backtrack(
          [...currentSchedule, lecture],
          new Set([...includedNames, lecture.name]),
          index + 1
        );
      }

      backtrack(currentSchedule, includedNames, index + 1);
    };

    backtrack([], new Set(), 0);
    return results;
  };

  const generateGreedyTimetableFromValid = (validTimetables, professor) => {
    if (!professor) return validTimetables;

    const scoredTimetables = validTimetables.map((timetable) => ({
      timetable,
      score: timetable.reduce(
        (count, lecture) =>
          lecture.professor.toLowerCase() === professor.toLowerCase()
            ? count + 1
            : count,
        0
      ),
    }));

    scoredTimetables.sort((a, b) => b.score - a.score);

    return scoredTimetables.length > 0 ? [scoredTimetables[0].timetable] : [];
  };

  const handleGenerateSchedule = () => {
    const filteredLectures = filterLectures(lecturesFromFile, selectedSemester);

    if (filteredLectures.length === 0) {
      alert("해당 학기에 강의가 없습니다.");
      return;
    }

    const validTimetables = generateValidTimetables(filteredLectures);

    if (validTimetables.length === 0) {
      alert("조건을 만족하는 시간표를 생성할 수 없습니다.");
      return;
    }

    const optimalTimetable = generateGreedyTimetableFromValid(
      validTimetables,
      preferredProfessor
    );

    setAllTimetables(optimalTimetable);
    setIsModalOpen(true);
  };

  return (
    <div className="App">
      <h1>시간표 생성기</h1>

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
        <div>선택된 학기: {selectedSemester}</div>
      </div>

      <div className="professor-input">
        <input
          type="text"
          placeholder="선호 교수"
          value={preferredProfessor}
          onChange={(e) => setPreferredProfessor(e.target.value)}
        />
      </div>

      <div className="file-upload">
        <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
        {fileReadComplete && <div className="file-read-complete">파일 읽기가 완료되었습니다!</div>}
      </div>

      <button onClick={handleGenerateSchedule} disabled={!selectedSemester}>
        시간표 생성
      </button>

      <Modal
        isOpen={isModalOpen}
        timetables={allTimetables}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default App;
