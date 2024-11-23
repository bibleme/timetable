import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";

const periodToHour = {
  "1": "09",
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

const Modal = ({ isOpen, timetables, onClose, onSelectTimetable }) => {
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
            <h3>
              {timetables.length === 1 && index === 0
                ? "최적 시간표"
                : `시간표 ${index + 1}`}
            </h3>
            {schedule.map((lecture, i) => (
              <div key={i} className="lecture-box">
                <strong>{lecture.name}</strong>
                <p>교수: {lecture.professor || "정보 없음"}</p>
                {lecture.parsedTimes &&
                  lecture.parsedTimes.map((time, idx) => (
                    <p key={idx}>
                      {time.day}요일, {time.period}:00
                    </p>
                  ))}
              </div>
            ))}
            <button onClick={() => onSelectTimetable(schedule)}>
              이 시간표 선택
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [lectures, setLectures] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allTimetables, setAllTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [selectedCriteria, setSelectedCriteria] = useState("mostFreeDays");
  const [optimalTimetable, setOptimalTimetable] = useState(null); // 최적 시간표 상태 추가

  useEffect(() => {
    fetch("/data/cleaned_sample.xlsx")
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setLectures(jsonData);
      })
      .catch((error) => console.error("Error fetching Excel file:", error));
  }, []);

  const parseTimes = (timesStr) => {
    if (!timesStr) return [];
    try {
      const times = JSON.parse(timesStr.replace(/'/g, '"'));
      return times.map((time) => {
        const day = time[0];
        const period = periodToHour[time.slice(1)];
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

  const handleGenerateSchedule = () => {
    const filteredLectures = filterLectures(lectures, selectedSemester);
    const validTimetables = generateValidTimetables(filteredLectures);

    if (!validTimetables.length) {
      alert("조건을 만족하는 시간표를 생성할 수 없습니다.");
      return;
    }

    setAllTimetables(validTimetables);
    setOptimalTimetable(null); // 최적 시간표 초기화
    setIsModalOpen(true);
  };

  const viewOptimalTimetable = () => {
    if (!allTimetables.length) {
      alert("생성된 시간표가 없습니다.");
      return;
    }

    let optimal;

    switch (selectedCriteria) {
      case "mostFreeDays":
        optimal = allTimetables.reduce((best, current) => {
          const calculateFreeDays = (schedule) => {
            const days = new Set();
            schedule.forEach((lecture) =>
              lecture.parsedTimes.forEach((time) => days.add(time.day))
            );
            return 5 - days.size;
          };

          return calculateFreeDays(current) > calculateFreeDays(best)
            ? current
            : best;
        });
        break;

      case "specificProfessor":
        const preferredProfessor = prompt("선호하는 교수님의 성함을 입력하세요:");
        if (!preferredProfessor) {
          alert("교수님의 성함을 입력해주세요.");
          return;
        }

        const filteredTimetables = allTimetables.filter((timetable) =>
          timetable.some(
            (lecture) =>
              lecture.professor &&
              lecture.professor
                .toLowerCase()
                .includes(preferredProfessor.toLowerCase().trim())
          )
        );

        if (!filteredTimetables.length) {
          alert(
            `${preferredProfessor} 교수님이 포함된 시간표를 찾을 수 없습니다.`
          );
          return;
        }

        optimal = filteredTimetables[0];
        break;

      case "balancedDistribution":
        optimal = allTimetables.reduce((best, current) => {
          const calculateDistribution = (schedule) => {
            const hoursPerDay = {};
            schedule.forEach((lecture) =>
              lecture.parsedTimes.forEach((time) => {
                hoursPerDay[time.day] = (hoursPerDay[time.day] || 0) + 1;
              })
            );
            const values = Object.values(hoursPerDay);
            return Math.max(...values) - Math.min(...values);
          };

          return calculateDistribution(current) < calculateDistribution(best)
            ? current
            : best;
        });
        break;

      default:
        alert("유효한 기준을 선택하세요.");
        return;
    }

    setOptimalTimetable(optimal);
    setIsModalOpen(true);
  };

  const handleSelectTimetableFromModal = (schedule) => {
    setSelectedTimetable(schedule);
    setIsModalOpen(false);
    alert("시간표가 선택되었습니다.");
  };

  return (
    <div className="App">
      <h1>SchedulEase</h1>

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

      <button onClick={handleGenerateSchedule} disabled={!selectedSemester}>
        시간표 생성
      </button>

      <div className="criteria-select">
        <select
          onChange={(e) => setSelectedCriteria(e.target.value)}
          value={selectedCriteria}
        >
          <option value="mostFreeDays">많은 공강</option>
          <option value="specificProfessor">특정 교수</option>
          <option value="balancedDistribution">고른 배분</option>
        </select>
      </div>

      <button onClick={viewOptimalTimetable} disabled={!allTimetables.length}>
        최적 시간표 보기
      </button>

      <Modal
        isOpen={isModalOpen}
        timetables={optimalTimetable ? [optimalTimetable] : allTimetables}
        onClose={() => setIsModalOpen(false)}
        onSelectTimetable={handleSelectTimetableFromModal}
      />

      <div className="selected-timetable">
        <h2>선택된 시간표</h2>
        {selectedTimetable ? (
          <div className="timetable">
            {selectedTimetable.map((lecture, i) => (
              <div key={i} className="lecture-box">
                <strong>{lecture.name}</strong>
                <p>교수: {lecture.professor || "정보 없음"}</p>
                {lecture.parsedTimes &&
                  lecture.parsedTimes.map((time, idx) => (
                    <p key={idx}>
                      {time.day}요일, {time.period}:00
                    </p>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <p>선택된 시간표가 없습니다. 시간표 생성 후 선택해주세요.</p>
        )}
      </div>
    </div>
  );
}

export default App;
