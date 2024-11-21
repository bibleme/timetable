import React, { useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

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
                <p>{lecture.location}</p>
                {lecture.parsedTimes &&
                  lecture.parsedTimes.map((time, idx) => (
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
  const [selectedCriteria, setSelectedCriteria] = useState("mostFreeDays");

  // parseTimes 함수
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

  // filterLectures 함수
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

  // hasConflict 함수
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

  // generateValidTimetables 함수
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

      if (
        !includedNames.has(lecture.name) &&
        !hasConflict(currentSchedule, lecture)
      ) {
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

  // handleFileUpload 함수
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const formattedData = jsonData.map((row) => ({
        name: row["name"],
        location: row["location"],
        semester: row["semester"],
        times: row["times"] ? row["times"] : [],
      }));

      setLecturesFromFile(formattedData);
      setFileReadComplete(true);
      console.log("업로드된 강의 데이터:", formattedData);
    };

    reader.readAsArrayBuffer(file);
  };

  // handleGenerateSchedule 함수
  const handleGenerateSchedule = () => {
    const filteredLectures = filterLectures(lecturesFromFile, selectedSemester);
    const validTimetables = generateValidTimetables(filteredLectures);

    if (!Array.isArray(validTimetables) || validTimetables.length === 0) {
      alert("조건을 만족하는 시간표를 생성할 수 없습니다.");
      return;
    }

    setAllTimetables(validTimetables);
    setIsModalOpen(true);

    console.log("생성된 모든 시간표:", validTimetables);
  };

  // handleSelectTimetable 함수
  const handleSelectTimetable = () => {
    if (allTimetables.length === 0) {
      alert("생성된 시간표가 없습니다.");
      return;
    }
  
    if (selectedCriteria === "mostFreeDays") {
      // 공강일이 가장 많은 단 하나의 시간표 선택
      const calculateEmptyDays = (schedule) => {
        const daysWithLectures = new Set();
        schedule.forEach((lecture) => {
          lecture.parsedTimes.forEach((time) => {
            daysWithLectures.add(time.day);
          });
        });
        const totalDays = 5; // 월~금
        return totalDays - daysWithLectures.size;
      };
  
      // 가장 공강일이 많은 시간표 선택
      const bestTimetable = allTimetables.reduce((best, current) => {
        const bestEmptyDays = calculateEmptyDays(best);
        const currentEmptyDays = calculateEmptyDays(current);
        return currentEmptyDays > bestEmptyDays ? current : best;
      });
  
      setAllTimetables([bestTimetable]); // 단일 시간표로 업데이트
      setIsModalOpen(true); // 모달 열기
      console.log("선택된 최적 시간표:", bestTimetable);
    } else {
      alert("현재 선택된 기준은 아직 구현되지 않았습니다.");
    }
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

      <div className="file-upload">
        <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
        {fileReadComplete && <div className="file-read-complete">파일 읽기가 완료되었습니다!</div>}
      </div>

      <button onClick={handleGenerateSchedule} disabled={!selectedSemester}>
        시간표 생성
      </button>

      <div className="criteria-select">
        <select
          onChange={(e) => setSelectedCriteria(e.target.value)}
          value={selectedCriteria}
        >
          <option value="mostFreeDays">많은 공강일</option>
          <option value="specificProfessor">특정 교수</option>
          <option value="leastFreeHours">적은 공강 시간</option>
        </select>
      </div>

      <button onClick={handleSelectTimetable} disabled={allTimetables.length === 0}>
        선택 기준에 따라 시간표 선택
      </button>

      <Modal isOpen={isModalOpen} timetables={allTimetables} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;