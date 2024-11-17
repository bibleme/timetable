import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

const days = ["월", "화", "수", "목", "금"];
const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9시부터 18시까지

// 교시 번호와 실제 시간 매핑
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
  "10": "18"
};

const semesters = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"];

function App() {
  const [schedule, setSchedule] = useState([]);
  const [lecturesFromFile, setLecturesFromFile] = useState([]); // 엑셀에서 불러온 전체 강의 목록
  const [selectedLecture, setSelectedLecture] = useState(null); // 사용자가 선택한 강의
  const [selectedSemester, setSelectedSemester] = useState(""); // 사용자가 선택한 학기

  // 엑셀 파일 업로드 및 데이터 읽기 함수
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // 엑셀 데이터 포맷에 맞춰 변환하여 전체 강의 목록에 저장
      const formattedData = jsonData.map((row) => ({
        name: row['교과목명'],
        code: row['학수번호'],
        professor: row['담당교수'],
        semester: row['학기'], // 학기 열 추가
        times: row['강의시간'] ? row['강의시간'].split(',') : [], // 여러 시간대 포함
      }));

      setLecturesFromFile(formattedData); // 전체 강의 목록 업데이트
    };

    reader.readAsArrayBuffer(file);
  };

  // 선택한 학기에 맞는 강의 목록 필터링
  const filteredLectures = lecturesFromFile.filter(
    (lecture) => lecture.semester === selectedSemester
  );

  // 선택한 강의를 시간표에 추가하는 함수
  const addSelectedLecture = () => {
    if (selectedLecture) {
      // 시간표에 추가할 강의 목록 생성
      const lecturesToAdd = selectedLecture.times.map((time) => {
        const [day, period] = time.trim().split(/(?=\d)/); // 요일과 교시 번호 분리
        const hour = periodToHour[period]; // 교시 번호를 실제 시간으로 변환
        return {
          name: selectedLecture.name,
          day,
          time: hour
        };
      });

      // 새로운 강의들을 한 번에 schedule에 추가
      setSchedule((prevSchedule) => [...prevSchedule, ...lecturesToAdd]);
      setSelectedLecture(null); // 선택 초기화
    } else {
      alert("강의를 선택해주세요.");
    }
  };

  return (
    <div className="App">
      <h1>시간표</h1>

      {/* 학기 선택 */}
      <div className="semester-select">
        <select onChange={(e) => setSelectedSemester(e.target.value)} value={selectedSemester}>
          <option value="">학기를 선택하세요</option>
          {semesters.map((semester) => (
            <option key={semester} value={semester}>{semester}</option>
          ))}
        </select>
      </div>

      {/* 엑셀 파일 업로드 */}
      <div className="file-upload">
        <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls" />
      </div>

      {/* 선택한 학기의 강의 목록 드롭다운 */}
      <div className="lecture-preview">
        <h2>강의 목록</h2>
        {filteredLectures.length > 0 ? (
          <select onChange={(e) => setSelectedLecture(JSON.parse(e.target.value))}>
            <option value="">강의를 선택하세요</option>
            {filteredLectures.map((lecture, index) => (
              <option key={index} value={JSON.stringify(lecture)}>
                {lecture.name} - {lecture.code} - {lecture.professor} - {lecture.times.join(', ')}
              </option>
            ))}
          </select>
        ) : (
          <p>학기를 선택하고 엑셀 파일에서 강의를 불러오세요.</p>
        )}
        <button onClick={addSelectedLecture}>강의 추가</button>
      </div>

      {/* 시간표 테이블 */}
      <div className="timetable">
        <table>
          <thead>
            <tr>
              <th>시간</th>
              {days.map((day) => (
                <th key={day}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="time-column">{hour}:00</td>
                {days.map((day) => {
                  const lecture = schedule.find((lec) => lec.day === day && lec.time === String(hour));
                  return (
                    <td key={day} className="lecture-cell">
                      {lecture ? <div className="lecture-box">{lecture.name}</div> : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
