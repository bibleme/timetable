import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";

// 교시 번호를 시간으로 변환하는 매핑 객체
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

// 학기 선택 목록
const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"];

// 모달 컴포넌트: 생성된 시간표를 표시하고 사용자 선택을 받음
const Modal = ({ isOpen, timetables, onClose, onSelectTimetable }) => {
  if (!isOpen) return null; // 모달이 닫혀있으면 렌더링하지 않음

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
            {/* 각 시간표 내 강의 목록 표시 */}
            {schedule.map((lecture, i) => (
              <div key={i} className="lecture-box">
                <strong>{lecture.name}</strong>
                <p>교수: {lecture.professor || "정보 없음"}</p>
                {/* 강의 시간 표시 */}
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

// 메인 App 컴포넌트
function App() {
  const [lectures, setLectures] = useState([]); // 강의 데이터 저장
  const [selectedSemester, setSelectedSemester] = useState(""); // 선택된 학기 저장
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태 관리
  const [allTimetables, setAllTimetables] = useState([]); // 생성된 모든 시간표 저장
  const [selectedTimetable, setSelectedTimetable] = useState(null); // 사용자가 선택한 시간표
  const [selectedCriteria, setSelectedCriteria] = useState("mostFreeDays"); // 최적 시간표 기준 선택
  const [optimalTimetable, setOptimalTimetable] = useState(null); // 최적 시간표 저장

  // Excel 파일에서 강의 데이터를 읽어오는 함수
  useEffect(() => {
    import("./cleaned_sample.xlsx") // Excel 파일 경로 가져오기
      .then((module) => module.default)
      .then((filePath) => {
        fetch(filePath)
          .then((response) => response.arrayBuffer()) // 파일 데이터를 읽음
          .then((data) => {
            const workbook = XLSX.read(data, { type: "array" }); // Excel 파일 읽기
            const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 선택
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet); // JSON 데이터로 변환
            setLectures(jsonData); // 강의 데이터 저장
          })
          .catch((error) => console.error("Error fetching Excel file:", error));
      });
  }, []);

  // 시간 문자열을 JSON으로 파싱하고, {day, period} 형식으로 변환
  const parseTimes = (timesStr) => {
    if (!timesStr) return [];
    try {
      const times = JSON.parse(timesStr.replace(/'/g, '"')); // 문자열을 JSON 형식으로 변환
      return times.map((time) => {
        const day = time[0]; // 요일
        const period = periodToHour[time.slice(1)]; // 교시 -> 시간 변환
        return { day, period };
      });
    } catch {
      return []; // 파싱 실패 시 빈 배열 반환
    }
  };

  // 특정 학기에 해당하는 강의만 필터링
  const filterLectures = (lectures, semester) => {
    const seen = new Set(); // 중복 강의 필터링용 Set
    return lectures
      .filter((lecture) => lecture.semester === semester) // 선택한 학기 강의만 남김
      .map((lecture) => ({
        ...lecture,
        parsedTimes: parseTimes(lecture.times), // 강의 시간 파싱
      }))
      .filter((lecture) => {
        const uniqueKey = `${lecture.name}-${lecture.times}`;
        if (seen.has(uniqueKey)) {
          return false; // 중복 제거
        }
        seen.add(uniqueKey);
        return true;
      });
  };

  // 강의 간 시간 충돌 여부를 확인하는 함수
const hasConflict = (existingSchedule, newLecture) => {
  // 새로 추가할 강의(newLecture)의 시간 중 하나라도
  // 기존 스케줄(existingSchedule)에 포함된 강의의 시간과
  // 요일(day)과 시간(period)이 겹치는지 확인
  return newLecture.parsedTimes.some((newTime) =>
    existingSchedule.some((scheduled) =>
      scheduled.parsedTimes.some(
        (scheduledTime) =>
          scheduledTime.day === newTime.day && // 요일이 같고
          scheduledTime.period === newTime.period // 시간이 같으면 true 반환
      )
    )
  );
};

// 가능한 모든 유효한 시간표를 생성하는 함수
const generateValidTimetables = (lectures) => {
  const results = []; // 결과로 반환할 모든 가능한 시간표 배열

  // 백트래킹(재귀) 함수 정의
  /* 핵심 개념
  * currentSchedule : 현재까지 만든 시간표 (시간 충돌, 중복 없음)
  * includeNames : 현재 시간표에 포함된 강의 이름의 집합
  * index : 탐색 중인 강의의 인덱스, lectures 배열에서 몇 번째 강의를 처리 중인지 나타냄
  * results : 가능한 모든 유효한 시간표를 저장하는 배열
  */
  const backtrack = (currentSchedule, includedNames, index) => {

    // 종료 조건: 모든 강의를 탐색한 경우
    if (index === lectures.length) {
      // 포함된 강의 이름의 수가 전체 고유 강의 이름 수와 같으면
      // (즉, 중복 없이 모든 강의가 포함된 경우)
      if (
        includedNames.size ===
        new Set(lectures.map((lecture) => lecture.name)).size
      ) {
        results.push([...currentSchedule]); // 현재 시간표를 결과에 추가
      }
      return; // 함수 종료
    }

    const lecture = lectures[index]; // 현재 강의 가져오기

    // 현재 강의를 시간표에 추가할 수 있는 경우
    if (
      !includedNames.has(lecture.name) && // 강의 이름이 중복되지 않고
      !hasConflict(currentSchedule, lecture) // 시간 충돌이 없을 때
    ) {
      // 현재 강의를 추가하고 다음 강의로 이동
      backtrack(
        [...currentSchedule, lecture], // 현재 스케줄에 강의 추가
        new Set([...includedNames, lecture.name]), // 포함된 강의 이름 추가
        index + 1 // 다음 강의로 이동
      );
    }

    // 현재 강의를 추가하지 않고 다음 강의로 이동
    backtrack(currentSchedule, includedNames, index + 1);
  };

  backtrack([], new Set(), 0); // 백트래킹 시작: 빈 스케줄, 빈 이름 집합, 첫 번째 강의
  return results; // 생성된 모든 유효한 시간표 반환
};

  // 시간표 생성 버튼 클릭 시 호출
  const handleGenerateSchedule = () => {
    const filteredLectures = filterLectures(lectures, selectedSemester); // 학기에 해당하는 강의 필터링
    const validTimetables = generateValidTimetables(filteredLectures); // 유효한 시간표 생성

    if (!validTimetables.length) {
      alert("조건을 만족하는 시간표를 생성할 수 없습니다.");
      return;
    }

    setAllTimetables(validTimetables); // 모든 시간표 저장
    setOptimalTimetable(null); // 최적 시간표 초기화
    setIsModalOpen(true); // 모달 열기
  };

  // 최적 시간표 보기 버튼 클릭 시 호출
  const viewOptimalTimetable = () => {
    if (!allTimetables.length) {
      alert("생성된 시간표가 없습니다.");
      return;
    }

    let optimal; // 최적 시간표 변수

    switch (selectedCriteria) {
      case "mostFreeDays":
        // 공강이 많은 시간표 찾기
        optimal = allTimetables.reduce((best, current) => {
          // 특정 시간표(schedule)의 공강일 수를 계산하는 함수
          const calculateFreeDays = (schedule) => {
            const days = new Set(); // 강의가 있는 요일을 저장할 Set(중복 제거를 위해 사용)
            // 주어진 시간표(schedule)에 포함된 모든 강의를 순회
            schedule.forEach((lecture) =>
              lecture.parsedTimes.forEach((time) => days.add(time.day)) // 강의가 있는 요일(time.day)을 Set에 추가
            );
            // 주중 요일 수(5, 월~금)에서 강의가 있는 요일 수를 빼서 공강일 수 계산
            return 5 - days.size; // 공강일 수 계산
          };
          // 현재 시간표(current)와 현재까지 최적 시간표(best)를 비교
          // 공강일 수가 더 많은 시간표를 선택하여 반환
          return calculateFreeDays(current) > calculateFreeDays(best)
            ? current // 현재 시간표(current)의 공강일 수가 더 많으면 이를 최적 시간표로 선택
            : best; // 그렇지 않으면 기존 최적 시간표(best)를 유지
        });
        break; // 종료

      case "specificProfessor":
          // 사용자가 선호하는 교수님 이름을 입력받음
          const preferredProfessor = prompt("선호하는 교수님의 성함을 입력하세요:");
        
          // 사용자가 아무 입력도 하지 않은 경우 경고를 표시하고 함수 종료
          if (!preferredProfessor) {
            alert("교수님의 성함을 입력해주세요.");
            return; // 입력이 없으면 더 이상 진행하지 않음
          }
        
          // 모든 시간표(allTimetables)에서 특정 교수님이 포함된 시간표를 필터링
          const filteredTimetables = allTimetables.filter((timetable) =>
            timetable.some(
              (lecture) =>
                lecture.professor && // 강의 정보에 교수님 이름이 존재하고
                lecture.professor
                  .toLowerCase() // 교수님 이름을 소문자로 변환하여
                  .includes(preferredProfessor.toLowerCase().trim()) // 사용자가 입력한 이름과 일치 여부 확인 (대소문자 무시, 공백 제거)
            )
          );
        
          // 특정 교수님이 포함된 시간표가 없는 경우 사용자에게 알림
          if (!filteredTimetables.length) {
            // 배열의 길이를 확인하여 배열이 비어있는지 검사
            // filteredTimetables.length가 0이라면, 만족하는 시간표 없다는 뜻이므로
            // !filteredTimetables.length가 true가 되어 alert 실행
            alert(
              `${preferredProfessor} 교수님이 포함된 시간표를 찾을 수 없습니다.`
            );
            return; // 필터링된 시간표가 없으면 더 이상 진행하지 않음
          }
        
          // 필터링된 시간표 중 첫 번째 시간표를 최적 시간표로 선택
          optimal = filteredTimetables[0];
          break;

case "balancedDistribution":
  optimal = allTimetables.reduce((best, current) => {
    // 시간표의 요일별 강의 시간 분포를 계산하는 함수
    const calculateDistribution = (schedule) => {
      const hoursPerDay = {}; // 요일별 강의 시간을 저장할 객체 초기화
      schedule.forEach((lecture) =>
        lecture.parsedTimes.forEach((time) => {
          // 시간 정보에서 강의가 진행되는 요일(time.day)에 해당하는 시간(hoursPerDay)에 카운트 추가
          // time.day가 기존에 없으면 0으로 초기화 후 1을 더함
          hoursPerDay[time.day] = (hoursPerDay[time.day] || 0) + 1;
        })
      );

      const values = Object.values(hoursPerDay); // 각 요일별 강의 시간 카운트를 배열로 변환
      // 고른 배분 계산: 강의 시간이 가장 많은 요일과 가장 적은 요일의 차이 반환
      return Math.max(...values) - Math.min(...values);
    };

    // 현재 시간표(current)와 최적 시간표(best) 중 더 고르게 분포된 시간표를 선택
    // calculateDistribution 함수로 요일별 강의 분포 차이를 계산하여 비교
    // 차이가 더 작은 시간표(current)가 더 고르게 분포된 경우 최적 시간표(best)로 설정
    return calculateDistribution(current) < calculateDistribution(best)
      ? current // current가 더 균형 잡힌 경우 선택
      : best; // 그렇지 않으면 기존 best 유지
  });
  break; // balancedDistribution 기준 처리 종료

      default:
        alert("유효한 기준을 선택하세요.");
        return;
    }

    setOptimalTimetable(optimal); // 최적 시간표 저장
    setIsModalOpen(true); // 모달 열기
  };

  // 모달에서 시간표 선택 시 호출
  const handleSelectTimetableFromModal = (schedule) => {
    setSelectedTimetable(schedule); // 선택된 시간표 저장
    setIsModalOpen(false); // 모달 닫기
    alert("시간표가 선택되었습니다.");
  };

  return (
    <div className="App">
      <h1>SchedulEase</h1>

      {/* 학기 선택 드롭다운 */}
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

      {/* 시간표 생성 버튼 */}
      <button onClick={handleGenerateSchedule} disabled={!selectedSemester}>
        시간표 생성
      </button>

      {/* 최적 시간표 기준 선택 */}
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

      {/* 최적 시간표 보기 버튼 */}
      <button onClick={viewOptimalTimetable} disabled={!allTimetables.length}>
        최적 시간표 보기
      </button>

      {/* 모달 컴포넌트 */}
      <Modal
        isOpen={isModalOpen}
        timetables={optimalTimetable ? [optimalTimetable] : allTimetables}
        onClose={() => setIsModalOpen(false)}
        onSelectTimetable={handleSelectTimetableFromModal}
      />

      {/* 선택된 시간표 표시 */}
      <div className="selected-timetable">
        <h2>선택된 시간표</h2>
        {selectedTimetable && selectedTimetable.length > 0 ? (
          <div className="timetable-grid">
            <table>
              <thead>
                <tr>
                  <th>시간</th>
                  <th>월요일</th>
                  <th>화요일</th>
                  <th>수요일</th>
                  <th>목요일</th>
                  <th>금요일</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(12)].map((_, hourIndex) => {
                  const hour = 9 + hourIndex; // 9시부터 시작
                  return (
                    <tr key={hour}>
                      <td>{hour}:00</td>
                      {["월", "화", "수", "목", "금"].map((day) => (
                        <td key={day}>
                          {selectedTimetable
                            .filter((lecture) =>
                              lecture.parsedTimes.some(
                                (time) =>
                                  time.day === day &&
                                  parseInt(time.period) === hour
                              )
                            )
                            .map((lecture, idx) => (
                              <div key={idx} className="lecture-box">
                                <strong>{lecture.name}</strong>
                                <p>{lecture.professor || "정보 없음"}</p>
                              </div>
                            ))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>선택된 시간표가 없습니다. 시간표 생성 후 선택해주세요.</p>
        )}
      </div>
    </div>
  );
}

export default App;