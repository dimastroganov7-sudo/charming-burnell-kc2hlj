import React, { useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const [activeTab, setActiveTab] = useState("schedule");

  return (
    <div className="app">
      <header className="app-header">
        <h1>GELTEK трансфер</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "schedule" ? "active" : ""}`}
          onClick={() => setActiveTab("schedule")}
        >
          Расписание
        </button>
        <button
          className={`tab ${activeTab === "admin" ? "active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          Настройка администратора
        </button>
      </div>

      <div className="content">
        {activeTab === "schedule" ? <ScheduleTab /> : <AdminTab />}
      </div>
    </div>
  );
};

// Ключ для localStorage
const STORAGE_KEY = "geltek_transfer_schedule";

// Начальные пустые данные
const getInitialSchedule = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : {};
};

const ScheduleTab = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [direction, setDirection] = useState("metro"); // "metro" или "gate"
  const [locations, setLocations] = useState({
    office: true,
    production: false,
    warehouse: false,
  });
  const [scheduleData, setScheduleData] = useState({});

  // Загружаем расписание из localStorage при монтировании
  useEffect(() => {
    setScheduleData(getInitialSchedule());
  }, []);

  // Также подписываемся на изменения в localStorage из других вкладок (опционально)
  useEffect(() => {
    const handleStorageChange = () => {
      setScheduleData(getInitialSchedule());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLocationChange = (e) => {
    setLocations({ ...locations, [e.target.name]: e.target.checked });
  };

  // Получение времени для конкретной комбинации
  const getTimeForRoute = (dir, locKey) => {
    const key = `${date}|${dir}|${locKey}`;
    return scheduleData[key] || null;
  };

  // Формируем список рейсов согласно фильтрам
  const getFilteredSchedule = () => {
    const selectedLocs = Object.keys(locations).filter(
      (key) => locations[key]
    );
    const dirName = direction === "metro" ? "метро" : "проходная";
    const locNames = {
      office: "Офис",
      production: "Производство",
      warehouse: "Склад",
    };

    const results = [];
    selectedLocs.forEach((locKey) => {
      const time = getTimeForRoute(direction, locKey);
      if (time) {
        results.push({
          time,
          from: dirName,
          to: locNames[locKey],
        });
      }
    });
    return results;
  };

  const filtered = getFilteredSchedule();

  return (
    <div className="schedule-tab">
      <div className="filter-panel">
        <div className="calendar-block">
          <label>Дата:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-input"
          />
        </div>

        <div className="direction-block">
          <span className="filter-label">Направление:</span>
          <label className="radio-label">
            <input
              type="radio"
              value="metro"
              checked={direction === "metro"}
              onChange={() => setDirection("metro")}
            />
            От метро
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="gate"
              checked={direction === "gate"}
              onChange={() => setDirection("gate")}
            />
            От проходной
          </label>
        </div>

        <div className="locations-block">
          <span className="filter-label">Пункт назначения:</span>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="office"
              checked={locations.office}
              onChange={handleLocationChange}
            />
            Офис
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="production"
              checked={locations.production}
              onChange={handleLocationChange}
            />
            Производство
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="warehouse"
              checked={locations.warehouse}
              onChange={handleLocationChange}
            />
            Склад
          </label>
        </div>
      </div>

      <div className="schedule-result">
        <h3>Расписание на {date.split("-").reverse().join(".")}</h3>
        {filtered.length > 0 ? (
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Откуда</th>
                <th>Куда</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.time}</td>
                  <td>{item.from}</td>
                  <td>{item.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">Нет рейсов по заданным фильтрам.</p>
        )}
      </div>
    </div>
  );
};

const AdminTab = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [scheduleData, setScheduleData] = useState({});
  const [editDate, setEditDate] = useState(new Date().toISOString().split("T")[0]);
  const [editDirection, setEditDirection] = useState("metro");
  const [editTimes, setEditTimes] = useState({
    office: "",
    production: "",
    warehouse: "",
  });

  const correctPassword = "GELTEK+12345+";

  // Загружаем данные из localStorage
  useEffect(() => {
    setScheduleData(getInitialSchedule());
  }, []);

  // При изменении даты/направления подгружаем сохранённые времена в форму
  useEffect(() => {
    if (isAuthenticated) {
      const officeTime = scheduleData[`${editDate}|${editDirection}|office`] || "";
      const productionTime = scheduleData[`${editDate}|${editDirection}|production`] || "";
      const warehouseTime = scheduleData[`${editDate}|${editDirection}|warehouse`] || "";
      setEditTimes({
        office: officeTime,
        production: productionTime,
        warehouse: warehouseTime,
      });
    }
  }, [editDate, editDirection, scheduleData, isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Неверный пароль");
    }
  };

  const handleSave = () => {
    // Создаём обновлённый объект расписания
    const newSchedule = { ...scheduleData };

    const setTime = (locKey, value) => {
      const key = `${editDate}|${editDirection}|${locKey}`;
      if (value && value.trim() !== "") {
        newSchedule[key] = value;
      } else {
        delete newSchedule[key];
      }
    };

    setTime("office", editTimes.office);
    setTime("production", editTimes.production);
    setTime("warehouse", editTimes.warehouse);

    // Сохраняем в localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSchedule));
    setScheduleData(newSchedule);

    // Оповещаем другие вкладки (для синхронизации)
    window.dispatchEvent(new Event("storage"));

    alert("Расписание сохранено!");
  };

  const handleTimeChange = (locKey, value) => {
    setEditTimes({ ...editTimes, [locKey]: value });
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <h2>Доступ администратора</h2>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="password-input"
          />
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-button">
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h2>Настройка расписания</h2>

      <div className="admin-controls">
        <div className="form-group">
          <label>Дата:</label>
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="date-input"
          />
        </div>

        <div className="form-group">
          <label>Направление:</label>
          <select
            value={editDirection}
            onChange={(e) => setEditDirection(e.target.value)}
            className="select-input"
          >
            <option value="metro">От метро</option>
            <option value="gate">От проходной</option>
          </select>
        </div>
      </div>

      <div className="time-editor">
        <h3>Укажите время отправления</h3>

        <div className="time-row">
          <label>Офис:</label>
          <input
            type="time"
            value={editTimes.office}
            onChange={(e) => handleTimeChange("office", e.target.value)}
          />
        </div>

        <div className="time-row">
          <label>Производство:</label>
          <input
            type="time"
            value={editTimes.production}
            onChange={(e) => handleTimeChange("production", e.target.value)}
          />
        </div>

        <div className="time-row">
          <label>Склад:</label>
          <input
            type="time"
            value={editTimes.warehouse}
            onChange={(e) => handleTimeChange("warehouse", e.target.value)}
          />
        </div>

        <button onClick={handleSave} className="save-button">
          Сохранить изменения
        </button>
        <p className="admin-hint">
          * Оставьте поле пустым, чтобы удалить рейс.
        </p>
      </div>
    </div>
  );
};

export default App;