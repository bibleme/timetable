# SchedulEase

[**SchedulEase**](https://bibleme.github.io/)는 대학생들을 위한 시간표 생성 웹사이트입니다.<br>
사용자가 학기를 선택하면 조건에 맞는 시간표를 생성할 수 있으며, 특정 기준에 따라 시간표를 최적화할 수도 있습니다.

---

## 📋 주요 기능

- **시간표 생성**: 사용자가 선택한 학기에 기반한 가능한 시간표 조합 생성
- **최적 시간표 추천**:
  - 공강이 가장 많은 시간표.
  - 특정 교수를 포함한 시간표.
  - 수업 시간이 고르게 분배된 시간표.
- **시간표 선택 및 확인**: 생성된 시간표 중 하나를 선택하고, 보기 편하게 정리된 형태로 확인 가능.
- **Excel 파일 데이터 처리**: 강의 데이터를 Excel 파일에서 로드하여 사용.


## 🛠 사용된 라이브러리

- **React**: 사용자 인터페이스를 위한 라이브러리
- **XLSX**: Excel 파일 처리 라이브러리


## 📂 프로젝트 구조

```
src
├── App.js               # 메인 컴포넌트
├── App.css              # 스타일 파일
├── cleaned_sample.xlsx  # 시간표 데이터 Excel 파일
└── index.js             # 엔트리 파일
```

## 📖 사용 방법

1. 학기 선택
화면 상단의 드롭다운 메뉴에서 학기를 선택하세요.

2. 시간표 생성
시간표 생성 버튼을 눌러 선택한 학기에 기반한 가능한 시간표 조합을 생성합니다.

3. 최적 시간표 보기
조건에 따라 최적 시간표 보기 버튼을 눌러 최적화된 시간표를 확인하세요.
- 공강이 많은 시간표
- 특정 교수를 포함한 시간표
- 수업 시간이 균형 있게 분배된 시간표

4. 시간표 선택
생성된 시간표 목록에서 원하는 시간표를 선택하세요. 선택된 시간표는 별도의 섹션에서 확인할 수 있습니다.


## 💡 주요 로직
시간표 충돌 체크
hasConflict 함수로 강의 시간 간 충돌 여부를 확인합니다.
시간표 생성
백트래킹(Backtracking) 알고리즘을 활용하여 가능한 모든 유효한 시간표 조합을 생성합니다.
최적 시간표 계산
다양한 기준(mostFreeDays, specificProfessor, balancedDistribution)에 따라 최적 시간표를 계산합니다.

## License
This project is licensed under the MIT License.


