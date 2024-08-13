"use client";
/**
 * 창고 엑셀화 Import
 */
// fundamental importing about React
import React, { useState, useEffect, useRef } from "react";

// Import MUI components
import Fab from "@mui/material/Fab";
import Button from "@mui/material/Button";
// 모달 페이지를 위한 Import
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

// Import SheetJS xlsx for Excel operations
import * as XLSX from "xlsx";

// Import Handsontable plugins and cell types
import {
  AutoColumnSize,
  Autofill,
  ContextMenu,
  CopyPaste,
  DropdownMenu,
  Filters,
  HiddenRows,
  registerPlugin,
} from "handsontable/plugins";
import {
  CheckboxCellType,
  NumericCellType,
  registerCellType,
} from "handsontable/cellTypes";

// Import Handsontable and its styles
import "@handsontable/react";
import { HotTable, HotColumn } from "@handsontable/react";
import "pikaday/css/pikaday.css";
import "handsontable/dist/handsontable.full.css";

// Import custom hooks and callbacks
import {
  addClassesToRows,
  alignHeaders,
} from "/components/Test/hooksCallbacks.jsx";

// Register cell types and plugins
registerCellType(CheckboxCellType);
registerCellType(NumericCellType);

registerPlugin(AutoColumnSize);
registerPlugin(Autofill);
registerPlugin(ContextMenu);
registerPlugin(CopyPaste);
registerPlugin(DropdownMenu);
registerPlugin(Filters);
registerPlugin(HiddenRows);

//MUIDataTable
import MUIDataTable, { TableFilterList } from "mui-datatables";

/**
 * 창고 시각화 Import
 */
// Library of konva and color
import {
  Stage,
  Layer,
  Rect,
  Text,
  Line,
  Circle,
  Transformer,
} from "react-konva";
// @material-ui/core components
import { makeStyles } from "@material-ui/core/styles";

import styles from "/styles/jss/nextjs-material-kit/pages/componentsSections/MyContainerStyle.jsx";

// 창고 상수 설정
const GRID_SIZE = 100;
const GRID_SIZE_SUB_50 = 50;
const GRID_SIZE_SUB_10 = 10;
const CANVAS_SIZE = 1000;

const useStyles = makeStyles(styles);

// --- 창고 관련 끝

// 복합체 시작
const MyContainerNavigation = ({ WHId, businessId }) => {
  /**
   * 창고 관련 const 들 모음
   */
  const stageRef = useRef(null);
  const layerRef = useRef(null);

  // 줌 인, 줌 아웃을 위한 Scale
  const [scale, setScale] = useState(1); // 초기 줌 값

  // 사각형을 추가하고 관리하는 State 추가
  const [locations, setLocations] = useState([
    {
      id: "0",
      x: 0,
      y: 0,
      z: 0,
      width: 0,
      height: 0,
      fill: "blue",
      draggable: false,
      order: 0,
      name: "임시",
      type: "임시",
      rotation: 0,
    },
  ]);

  // 마지막으로 클릭한 상자를 추적하는 상태 추가
  const [selectedLocation, setSelectedLocation] = useState(null);
  // 마지막으로 클릭한 상자를 수정하는 폼을 띄우기 위한 상태 추가
  const [selectedLocationTransform, setSelectedLocationTransform] =
    useState(null);
  // 현재 벽 생성 / 일반 커서 를 선택하기 위한 State
  const [currentSetting, setCurrentSetting] = useState("location");
  // 상자의 hover Effect를 위한 상태 추가
  const [hoveredRectId, setHoveredRectId] = useState(null);

  // 앙커를 추가하고 관리하는 State 추가
  const [anchors, setAnchors] = useState([
    {
      id: "0",
      x: 0,
      y: 0,
      radius: 0,
      stroke: "#666",
      fill: "#ddd",
      opacity: 1,
      strokeWidth: 2,
      draggable: false,
    },
  ]);

  // 마우스 포인터에 닿은 앙커를 기록하는 것
  const [hoveredAnchor, setHoveredAnchor] = useState(null);
  // 선택된 층을 알려주는 Method
  const [selectedFloor, setSelectedFloor] = useState(1);

  /**
   * 창고 관련 Const 끝
   */

  //모달을 위한 데이터 셋
  const [ModalTableData, setModalTableData] = useState([]);
  const [columns, setColumns] = useState([]); // 각 상자 속 데이터를 위한 칼럼
  const hotTableRef = useRef(null);

  // State to open the modal when a date is clicked
  const [openDetailModal, setOpenDetailModal] = useState(false);

  // Define state to hold detailed data for the selected notification
  const [detailedNotificationData, setDetailedNotificationData] = useState([]);

  // State to hold hovered location IDs
  const [hoveredLocations, setHoveredLocations] = useState([]);

  // Handle cell click to show details
  const handleCellClick = (date, type) => {
    // Filter the detailedData based on the selected date and type
    const filteredData = detailedData.filter(
      (item) =>
        new Date(item.date).toLocaleDateString() === date &&
        item.productFlowType === type
    );

    // Extract the location names from the filtered data
    const locationNames = filteredData.map((item) => item.currentLocationName);

    // Find the IDs of the locations that match the extracted location names
    const matchedLocationIds = locations
      .filter((location) => locationNames.includes(location.name))
      .map((location) => location.id);
    console.log(matchedLocationIds);

    // Store the filtered data and matched location IDs in state
    setDetailedNotificationData(filteredData);
    setHoveredLocations(matchedLocationIds);
    setOpenDetailModal(true); // Open the modal to display details
  };

  /**
   * Location 함수 영역
   */

  // Add this helper function to clear existing anchors and lines
  const clearAnchorsAndLines = () => {
    anchorsRef.current.forEach(({ start, end, line }) => {
      start.destroy();
      end.destroy();
      line.destroy();
    });
    anchorsRef.current = [];
  };

  // API를 통해 해당하는 창고(번호)의 모든 location(적재함)과 wall(벽)을 가져오는 메서드
  const getWarehouseAPI = async (WHId) => {
    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/warehouses/${WHId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const apiConnection = await response.json();
        const warehouseData = apiConnection.result; // 데이터 추출

        // 받아온 데이터 중 로케이션 데이터 처리
        const locations = warehouseData.locations;
        if (!locations) {
          console.error("Locations data not found");
          return;
        }
        console.log(locations);
        const newLocations = locations.map((location, index) => {
          const startColor = { r: 27, g: 177, b: 231 }; // Starting color (#1bb1e7)
          const endColor = { r: 0, g: 0, b: 255 }; // Ending color (#0000FF)

          // Calculate the color components based on the fill value
          const red = Math.round(
            startColor.r + ((endColor.r - startColor.r) * location.fill) / 100
          );
          const green = Math.round(
            startColor.g + ((endColor.g - startColor.g) * location.fill) / 100
          );
          const blue = Math.round(
            startColor.b + ((endColor.b - startColor.b) * location.fill) / 100
          );

          return {
            id: location.id.toString(),
            x: location.xposition,
            y: location.yposition,
            width: location.xsize || 50,
            height: location.ysize || 50,
            z: location.zsize,
            fill: `rgba(${red}, ${green}, ${blue}, 1)`, // Calculate RGB with alpha as 1
            draggable: true,
            order: index,
            name: location.name || `적재함 ${index}`,
            type: "location",
            rotation: 0,
          };
        });

        // 벽 데이터 처리
        const walls = warehouseData.walls;
        if (!walls) {
          console.error("Walls data not found");
          return;
        }
        clearAnchorsAndLines();
        const existingAnchors = [];
        const newAnchors = [];

        // 이미 존재하는 앙커를 가져오거나 생성하는 메서드 정의
        const getOrCreateAnchor = (id, x, y) => {
          let existingAnchor = findExistingAnchor(existingAnchors, x, y);
          if (!existingAnchor) {
            existingAnchor = buildAnchor(id, x, y);
            existingAnchors.push(existingAnchor);
          }
          return existingAnchor;
        };

        walls.forEach(({ startID, startX, startY, endID, endX, endY }) => {
          const startAnchor = getOrCreateAnchor(startID, startX, startY);
          const endAnchor = getOrCreateAnchor(endID, endX, endY);

          const newLine = new Konva.Line({
            points: [startX, startY, endX, endY],
            stroke: "brown",
            strokeWidth: 10,
            lineCap: "round",
          });

          newAnchors.push({
            start: startAnchor,
            end: endAnchor,
            line: newLine,
          });
        });

        anchorsRef.current = newAnchors;
        newAnchors.forEach(({ line }) => layerRef.current.add(line));
        layerRef.current.batchDraw();

        setLocations(newLocations);
      } else {
        console.error("Error loading locations data");
      }
    } catch (error) {
      console.error("Error loading locations data:", error);
    }
  };

  // 줌-인 줌-아웃 기능
  const handleZoomIn = () => {
    setScale(scale * 1.2);
  };
  const handleZoomOut = () => {
    setScale(scale / 1.2);
  };

  // 그리드 라인 생성하는 부분
  const generateGridLines = () => {
    const lines = [];
    // 100cm 그리드
    for (let i = 0; i <= CANVAS_SIZE / GRID_SIZE; i++) {
      const pos = i * GRID_SIZE;
      // Horizontal Lines
      lines.push(
        <Line
          key={`h${i}`}
          points={[0, pos, CANVAS_SIZE, pos]}
          stroke="gray"
          strokeWidth={0.5}
          dash={[15, 15]}
        />
      );
      //Vertical Lines
      lines.push(
        <Line
          key={`v${i}`}
          points={[pos, 0, pos, CANVAS_SIZE]}
          stroke="gray"
          strokeWidth={0.5}
          dash={[15, 15]}
        />
      );
    }
    for (let i = 0; i <= CANVAS_SIZE / GRID_SIZE_SUB_50; i++) {
      const pos = i * GRID_SIZE_SUB_50;
      lines.push(
        <Line
          key={`sub50h${i}`}
          points={[0, pos, CANVAS_SIZE, pos]}
          stroke="lightgray"
          strokeWidth={0.5}
          dash={[10, 10]}
        />
      );
      lines.push(
        <Line
          key={`sub50v${i}`}
          points={[pos, 0, pos, CANVAS_SIZE]}
          stroke="lightgray"
          strokeWidth={0.5}
          dash={[10, 10]}
        />
      );
      // Handle more grid lines for finer detail
    }
    return lines;
  };

  // 상대적 위치를 보여주는 Pointer에 대한 수정
  const Pointer = (event) => {
    const { x, y } = event.target.getStage().getPointerPosition();
    var stageAttrs = event.target.getStage().attrs;

    if (!stageAttrs.x) {
      // 드래그 하지 않음
      x = x / stageAttrs.scaleX;
      y = y / stageAttrs.scaleY;
    } else {
      // 드래그해서 새로운 stageAttrs의 x,y가 생김
      x = (x - stageAttrs.x) / stageAttrs.scaleX;
      y = (y - stageAttrs.y) / stageAttrs.scaleY;
    }
    return { x, y };
  };

  // 빈 공간을 클릭했을 때 사각형 선택 해제하는 함수
  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedLocationTransform(null);
    }
  };

  /**
   * 벽 생성 파트
   */

  // 선을 잇는 기능을 넣기 위한 State
  const [line, setLine] = useState(null);
  const [startPos, setStartPos] = useState(null);

  // 선을 그리는 함수
  const drawLine = (start, end) => {
    const newLine = new Konva.Line({
      stroke: "black",
      points: [start.x, start.y, end.x, end.y],
      listening: false,
    });
    layerRef.current.add(newLine);
    layerRef.current.batchDraw();
  };

  // --- 벽의 기준점을 생성하는 메서드 ---
  const buildAnchor = (id, x, y) => {
    const layer = layerRef.current;
    const newAnchor = new Konva.Circle({
      id: id,
      x: Math.round(x),
      y: Math.round(y),
      radius: 10,
      stroke: "#666",
      fill: "#ddd",
      opacity: 0,
      strokeWidth: 2,
      draggable: currentSetting !== "wall",
    });
    layer.add(newAnchor);
    setAnchors((prevAnchors) => [...prevAnchors, newAnchor]);

    newAnchor.on("mouseover", function () {
      document.body.style.cursor = "pointer";
      this.strokeWidth(4);
      this.opacity(1);
      this.moveToTop();
      setHoveredAnchor(this);
    });
    newAnchor.on("mouseout", function () {
      document.body.style.cursor = "default";
      this.strokeWidth(2);
      this.opacity(0);
      this.moveToTop();
      setHoveredAnchor(null);
    });

    newAnchor.on("dragmove", function () {
      updateLinesBetweenAnchors();
      highlightOverlappingAnchors(this);
      this.moveToTop();
    });

    newAnchor.on("dragend", function () {
      mergeAnchors(this);
      this.moveToTop();
    });

    return newAnchor;
  };
  // 벽의 기준점과 다른 기준점 사이의 선을 만드는 함수
  const updateLinesBetweenAnchors = () => {
    anchorsRef.current.forEach(({ line, start, end }) => {
      line.points([start.x(), start.y(), end.x(), end.y()]);
    });
    layerRef.current.batchDraw();
  };

  // 마우스 액션과 무관하게 마우스가 위로 올라가면 Anchor를 강조하는 함수
  const highlightOverlappingAnchors = (draggedAnchor) => {
    const stage = stageRef.current;
    stage.find("Circle").forEach((anchor) => {
      if (anchor === draggedAnchor) return;
      if (isOverlapping(draggedAnchor, anchor)) {
        anchor.stroke("#ff0000");
        anchor.opacity(1);
        anchor.moveToTop();
      } else {
        anchor.stroke("#666");
        anchor.opacity(0);
        anchor.moveToTop();
      }
    });
  };

  // 두개의 anchor가 겹쳤는지를 확인하는 매서드
  const isOverlapping = (anchor1, anchor2) => {
    const a1 = anchor1.getClientRect();
    const a2 = anchor2.getClientRect();
    return !(
      a1.x > a2.x + a2.width ||
      a1.x + a1.width < a2.x ||
      a1.y > a2.y + a2.height ||
      a1.y + a1.height < a2.y
    );
  };

  // 두 개의 anchor를 규합하고 선의 관계를 정립하는 메서드
  const mergeAnchors = (draggedAnchor) => {
    const stage = stageRef.current;
    const layer = layerRef.current;
    let merged = false;

    stage.find("Circle").forEach((anchor) => {
      if (anchor === draggedAnchor) return;
      if (isOverlapping(draggedAnchor, anchor)) {
        updateAnchorReferences(draggedAnchor, anchor);
        draggedAnchor.destroy(); // Remove the dragged anchor
        layer.batchDraw();
        merged = true;
      }
    });
    if (!merged) {
      draggedAnchor.stroke("#666");
      layer.batchDraw();
    }
  };

  const updateAnchorReferences = (draggedAnchor, anchor) => {
    let count = 0;
    anchorsRef.current.forEach((anchorObj) => {
      if (anchorObj.start === draggedAnchor) anchorObj.start = anchor;
      if (anchorObj.end === draggedAnchor) anchorObj.end = anchor;
      count++;
    });
    updateLinesBetweenAnchors();
  };

  const [lineData, setLineData] = useState({
    startX: "",
    startY: "",
    endX: "",
    endY: "",
  });
  const anchorsRef = useRef([]);

  //같은 위치를 찾기위함
  const isSamePosition = (x1, y1, x2, y2) => {
    return (
      Math.round(x1) === Math.round(x2) && Math.round(y1) === Math.round(y2)
    );
  };

  //같은 위치에 존재하는 Anchor를 찾기 위함
  const findExistingAnchor = (anchors, x, y) => {
    return anchors.find((anchor) =>
      isSamePosition(anchor.x(), anchor.y(), x, y)
    );
  };
  /**
   * 선택된 사각형의 데이터를 보여주는 메서드
   */
  // Fetch JSON data for the selected rectangle
  const fetchRectangleData = async (id) => {
    try {
      const response = await fetch("/api/load-json", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const jsonData = await response.json();
        const rectangleData = jsonData.filter((row) => row[0] === String(id));
        return rectangleData || [];
      } else {
        console.error("Error loading JSON data");
        return [];
      }
    } catch (error) {
      console.error("Error loading JSON data:", error);
      return [];
    }
  };

  // 엑셀기록과 함께 해당하는 상자를 누르면 데이터를 보여주는 함수
  const [rectangleData, setRectangleData] = useState([]);

  /**
   *  useEffect Part for Reactive action
   */

  // 선을 적용하기 위한 UseEffect
  useEffect(() => {
    const stage = stageRef.current;
    const layer = layerRef.current;

    //Event Handler for 'mousedown' Stage 위에 올렸을 때,
    const handleMouseDown = () => {
      if (currentSetting === "wall") {
        // 정확한 위치를 얻어온다.
        const pos = stage.getPointerPosition();
        var stageAttrs = stage.attrs;
        //드래그 없음
        if (!stageAttrs.x) {
          pos.x = pos.x / stageAttrs.scaleX;
          pos.y = pos.y / stageAttrs.scaleY;
        } // 드래그 있음
        else {
          pos.x = (pos.x - stageAttrs.x) / stageAttrs.scaleX;
          pos.y = (pos.y - stageAttrs.y) / stageAttrs.scaleY;
        }

        if (hoveredAnchor !== null) {
          pos.x = hoveredAnchor.attrs.x;
          pos.y = hoveredAnchor.attrs.y;
        } else {
          // 10단위로 변경
          pos.x = Math.round(pos.x / 10) * 10;
          pos.y = Math.round(pos.y / 10) * 10;
        }
        setStartPos(pos);
        const newLine = new Konva.Line({
          stroke: "black",
          strokeWidth: 5,
          listening: false,
          points: [pos.x, pos.y, pos.x, pos.y],
        });
        layer.add(newLine);
        setLine(newLine);
      }
    };

    //Event Handler for 'mousemove' stage 위에서 움직일 때,
    const handleMouseMove = () => {
      if (currentSetting === "wall") {
        if (!line) return;
        // 정확한 위치를 얻어온다.
        const pos = stage.getPointerPosition();
        var stageAttrs = stage.attrs;
        if (!stageAttrs.x) {
          // 드래그 하지 않음
          pos.x = pos.x / stageAttrs.scaleX;
          pos.y = pos.y / stageAttrs.scaleY;
        } else {
          // 드래그해서 새로운 stageAttrs의 x,y가 생김
          pos.x = (pos.x - stageAttrs.x) / stageAttrs.scaleX;
          pos.y = (pos.y - stageAttrs.y) / stageAttrs.scaleY;
        }

        const points = [startPos.x, startPos.y, pos.x, pos.y];

        line.points(points);
        layer.batchDraw();
      }
    };

    //Event Handler for 'mouseup' stage 위에서 마우스를 뗄 때,
    const handleMouseUp = (e) => {
      if (currentSetting === "wall") {
        //라인이 없으면 작동 X
        if (!line) return;
        //타겟을 찾으면 라인 생성
        if (e.target.hasName("target")) {
          // 정확한 위치를 얻어온다.
          const pos = stage.getPointerPosition();
          var stageAttrs = stage.attrs;
          if (!stageAttrs.x) {
            // 드래그 하지 않음
            pos.x = pos.x / stageAttrs.scaleX;
            pos.y = pos.y / stageAttrs.scaleY;
          } else {
            // 드래그해서 새로운 stageAttrs의 x,y가 생김
            pos.x = (pos.x - stageAttrs.x) / stageAttrs.scaleX;
            pos.y = (pos.y - stageAttrs.y) / stageAttrs.scaleY;
          }
          drawLine(startPos, pos);
          setLine(null);
          setStartPos(null);
          line.remove();
        } else {
          line.remove();
          layer.draw();
          //벽을 추가하기 위한 메서드
          // 정확한 위치를 얻어온다.
          const pos = stage.getPointerPosition();
          var stageAttrs = stage.attrs;
          if (!stageAttrs.x) {
            // 드래그 하지 않음
            pos.x = pos.x / stageAttrs.scaleX;
            pos.y = pos.y / stageAttrs.scaleY;
          } else {
            // 드래그해서 새로운 stageAttrs의 x,y가 생김
            pos.x = (pos.x - stageAttrs.x) / stageAttrs.scaleX;
            pos.y = (pos.y - stageAttrs.y) / stageAttrs.scaleY;
          }

          // 앙커 위에서 벽을 생성하면 그 앙커를 기준으로 생성하게끔 하는 역할
          if (hoveredAnchor !== null) {
            pos.x = hoveredAnchor.attrs.x;
            pos.y = hoveredAnchor.attrs.y;
          }

          handleAddWall(startPos, pos);

          setLine(null);
          setStartPos(null);
        }
      }
    };

    // 벽을 추가한다.
    const handleAddWall = (start, end) => {
      if (currentSetting === "wall") {
        // 새로운 앙커를 생성하는 메서드
        const getOrCreateAnchor = (x, y) => {
          let existingAnchor = anchorsRef.current.find(
            (anchor) =>
              isSamePosition(anchor.start.x(), anchor.start.y(), x, y) ||
              isSamePosition(anchor.end.x(), anchor.end.y(), x, y)
          );
          if (!existingAnchor) {
            const newId = anchorsRef.current.length
              ? Math.max(
                  ...anchorsRef.current.flatMap(({ start, end }) => [
                    parseInt(start.id(), 10),
                    parseInt(end.id(), 10),
                  ])
                ) + 1
              : 1;
            existingAnchor = buildAnchor(newId, x, y);
          } else {
            existingAnchor = isSamePosition(
              existingAnchor.start.x(),
              existingAnchor.start.y(),
              x,
              y
            )
              ? existingAnchor.start
              : existingAnchor.end;
          }
          return existingAnchor;
        };

        const newAnchorTop = getOrCreateAnchor(start.x, start.y);
        const newAnchorBottom = getOrCreateAnchor(end.x, end.y);

        const newLine = new Konva.Line({
          points: [start.x, start.y, end.x, end.y],
          stroke: "brown",
          strokeWidth: 10,
          lineCap: "round",
        });
        const layer = layerRef.current;
        layer.add(newLine);

        anchorsRef.current.push({
          start: newAnchorTop,
          end: newAnchorBottom,
          line: newLine,
        });

        layer.batchDraw();
      }
    };
    /**
     * 벽 생성 관련 마우스 컨트롤 Mouse
     */
    if (currentSetting === "wall") {
      // Event Listeners 추가하기
      stage.on("mousedown", handleMouseDown);
      stage.on("mousemove", handleMouseMove);
      stage.on("mouseup", handleMouseUp);
    }
    //레이어의 초기 상태 그리기
    layer.draw();

    /**
     * 선택된 사각형의 물품 목록을 보여준다.
     */
    if (selectedLocation) {
      fetchRectangleData(selectedLocation.id).then((data) => {
        setRectangleData(data);
      });
    }

    // Clean-up the Function to remove event Listeners
    return () => {
      stage.off("mousedown", handleMouseDown);
      stage.off("mousemove", handleMouseMove);
      stage.off("mouseup", handleMouseUp);
    };
  }, [line, startPos, currentSetting, selectedLocation]);

  const [showDetails, setShowDetails] = useState(true); // Default to showing details
  //처음에 창고 정보를 불러온다.
  useEffect(() => {}, []);

  /**
   * 재고 목록과 알림 내역을 불러오는 메서드(Method) 정의
   */

  // 제품 목록 / 입고 / 출고 / 수정하기 / 이동하기에 쓰이는 data Table state
  const [tableData, setTableData] = useState([]);
  const [productColumns, setProductColumns] = useState([]);

  // 사장님이 갖고 있는 상품들을 가져오는 API
  const productGetAPI = async (businessId) => {
    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/products?businessId=${businessId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const apiConnection = await response.json();
        const products = apiConnection.result;
        console.log("상품 불러옴");
        console.log(products); // 삭제해야 할 console.log (콘솔)

        // Extract only the required columns
        const formattedData = products.map((product) => ({
          hiddenId: product.id,
          name: product.name,
          barcode: product.barcode,
          quantity: product.quantity,
          locationName: product.locationName || "임시",
          floorLevel: product.floorLevel,
          expirationDate: product.expirationDate || "없음",
          warehouseId: product.warehouseId,
        }));

        // Define the columns
        const headers = [
          "식별자",
          "이름",
          "바코드(식별번호)",
          "수량",
          "적재함",
          "단(층)수",
          "유통기한",
          "창고",
        ];

        const formattedColumns = [
          { name: "hiddenId", label: "식별자", options: { display: false } },
          { name: "name", label: "상품명" },
          { name: "barcode", label: "바코드" },
          { name: "quantity", label: "수량" },
          { name: "locationName", label: "적재함" },
          { name: "floorLevel", label: "층수" },
          { name: "expirationDate", label: "유통기한" },
          { name: "warehouseId", label: "창고" },
        ];

        // Prepare the data for Handsontable
        const data = formattedData.map((product) => [
          product.hiddenId,
          product.name,
          product.barcode,
          product.quantity,
          product.locationName,
          product.floorLevel,
          product.expirationDate,
          product.warehouseId,
        ]);

        console.log("여기가 문제?");
        console.log(data); // 삭제해야 할 console.log (콘솔)

        setColumns(formattedColumns);
        setTableData(data);
      } else {
        console.error("Error loading rectangles data");
      }
    } catch (error) {
      console.error("Error loading rectangles data:", error);
    }
  };

  // 변동 내역 / 알림함에서 쓰이는 data Table state
  const [notificationTableData, setNotificationTableData] = useState([]);
  const [detailedData, setDetailedData] = useState([]); // 모든 변동 사항을 기록한다.
  const [notificationColumn, setNotificationColumn] = useState([]); // 알림 단위로 변동사항에 대한 칼럼

  // 모든 알림(변동내역)을 가져오는 메서드
  const getNotificationsAPI = async (businessId) => {
    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/products/notification?businessId=${businessId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const apiConnection = await response.json();
        const { productFlowResponseDtos, expirationProductResponseDtos } =
          apiConnection.result;

        // Combine all notifications
        const combinedData = [...productFlowResponseDtos];

        // Sort combined data by date
        const sortedData = combinedData.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

        // Set the detailed data state
        setDetailedData(sortedData);

        // Map to formatted data for initial display
        const formattedData = sortedData.map((item) => ({
          date: new Date(item.date).toLocaleDateString(),
          type: item.productFlowType,
          barcode: item.barcode,
          name: item.name,
          quantity: item.quantity,
          locationName: item.currentLocationName,
          floorLevel: item.currentFloorLevel,
          trackingNumber: item.trackingNumber,
        }));

        setNotificationTableData(formattedData);

        setNotificationColumn([
          { name: "date", label: "날짜" },
          { name: "type", label: "유형" },
          { name: "barcode", label: "바코드" },
          { name: "name", label: "상품명" },
          { name: "quantity", label: "수량" },
          { name: "locationName", label: "적재함" },
          { name: "floorLevel", label: "층수" },
          { name: "trackingNumber", label: "송장번호" },
        ]);
      } else {
        console.error("Error fetching notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const [dateColumns, setDateColumns] = useState([]); // 일자별로

  // 모든 변동 내역을 날짜별로 묶어 알림으로 바꾸는 함수
  const showUniqueDates = async () => {
    // Group data by date and type
    const groupedData = detailedData.reduce((acc, item) => {
      const dateKey = new Date(item.date).toLocaleDateString();
      const typeKey = item.productFlowType;
      const key = `${dateKey}-${typeKey}`;

      if (!acc[key]) {
        acc[key] = {
          date: dateKey,
          type: typeKey,
          count: 0,
        };
      }

      acc[key].count += 1;
      return acc;
    }, {});

    // Format grouped data for table display
    const formattedData = Object.values(groupedData).map((entry) => ({
      date: entry.date,
      type: entry.type,
      count: entry.count,
    }));

    setNotificationTableData(formattedData);
    setDateColumns([
      { name: "date", label: "날짜" },
      { name: "type", label: "유형" },
      { name: "count", label: "수량" },
    ]);
  };

  // 현재 상자의 재고 목록을 불러오는 함수
  const handleSelectedData = (rectName, selectedFloor) => {
    console.log("잘 가니?");
    console.log(rectName);
    console.log(selectedFloor);

    const selectedData = tableData
      .filter(
        (product) => product[4] === rectName && product[5] === selectedFloor
      ) // 같은 위치에 있는 상품만 출력
      .map((product) => ({
        hiddenId: product[0],
        name: product[1],
        barcode: product[2],
        quantity: product[3],
        expirationDate: product[6] || "없음",
      }));

    // console.log(tableData)
    setModalTableData(selectedData);
    console.log(selectedData);
  };

  // Extract fill percentage from RGBA color
  const extractFillPercentage = (rgbaString) => {
    const matches = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

    if (matches) {
      const red = parseInt(matches[1], 10);
      const green = parseInt(matches[2], 10);

      // Calculate the percentage using both red and green components
      // Both red and green start at a higher value and decrease to 0 as the fill increases
      const redPercentage = (27 - red) / 27;
      const greenPercentage = (177 - green) / 177;

      // The fill percentage is determined by averaging the percentage contribution from red and green
      const fillPercentage = ((redPercentage + greenPercentage) / 2) * 100;

      return fillPercentage.toFixed(1);
    }

    return "0.0"; // Default to 0% if unable to parse
  };

  /**
   * UseEffect를 통해 새로고침 때마다 api로 사장님의 재고를 불러옴
   * + 유저정보
   */

  useEffect(() => {
    getWarehouseAPI(WHId); // 창고 정보를 불러온다.
    //재고 목록과 알림 내역을 불러온다.
    productGetAPI(businessId);
    getNotificationsAPI(businessId);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={scale}
        scaleY={scale}
        draggable={true}
        ref={stageRef}
        onPointerMove={Pointer}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Layer ref={layerRef}>
          {generateGridLines()}
          {locations.map((rect, i) => (
            <RectangleTransformer
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill={rect.fill}
              shapeProps={rect}
              isHovered={hoveredLocations.includes(rect.id)} // Pass hover state
              isSelected={rect.id === selectedLocationTransform}
              onSelect={() => {
                setSelectedLocationTransform(rect.id);
                setSelectedLocation(rect);
                setSelectedFloor(1);
                handleSelectedData(rect.name, selectedFloor);
              }}
              onChange={(newAttrs) => {
                const rects = locations.slice();
                rects[i] = newAttrs;
                setLocations(rects);
              }}
            />
          ))}
        </Layer>
      </Stage>
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          display: "flex",
          gap: "10px",
        }}
      >
        <Button round onClick={handleZoomIn}>
          zoomIn
        </Button>
        <Button onClick={handleZoomOut}>zoomOut</Button>
      </div>
      <div
        style={{
          position: "absolute",
          top: "10vh",
          padding: "10px",
          width: "200px",
          height: "80vh",
          overflowY: "auto",
          backgroundColor: "rgba(247, 247, 247, 0.9)",
          boxShadow: "2px 0 5px rgba(0, 0, 0, 0.1)",
        }}
      >
        <hr />
        <div style={{ marginBottom: "10px" }}>
          <Button onClick={() => setShowDetails(true)}>Show Details</Button>
          <Button
            onClick={() => {
              setShowDetails(false);
              showUniqueDates();
            }}
            color="primary"
            round
          >
            Show Notifications
          </Button>
        </div>
        {showDetails ? (
          <div>
            <h3>재고함 목록</h3>
            {locations.length !== 0 ? (
              <div
                style={{
                  width: "100%",
                }}
              >
                <ul
                  style={{
                    height: "50vh",
                    overflowY: "auto",
                    listStyle: "none",
                    padding: 0,
                  }}
                >
                  {locations
                    .filter((locations) => locations.type === "location")
                    .map((locations, index) => (
                      <li
                        key={index}
                        onClick={() => {
                          setSelectedLocation(locations);
                          setSelectedLocationTransform(locations.id);
                          setSelectedFloor(1);
                          handleSelectedData(locations.name, selectedFloor);
                        }}
                        style={{
                          cursor: "pointer",
                          padding: "5px",
                          borderBottom: "1px solid #ccc",
                          textAlign: "center",
                          backgroundColor:
                            selectedLocation &&
                            selectedLocation.id === locations.id
                              ? "#f0f0f0" // Highlight color for selected item
                              : "transparent", // Default color for unselected items
                          transition: "background-color 0.3s", // Smooth transition effect
                        }}
                      >
                        {locations.name}
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <p>현재 재고함이 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="notification">
            <h3>알림함</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {notificationTableData.map(({ date, type }, index) => (
                <li
                  key={index}
                  onClick={() => handleCellClick(date, type)}
                  style={{
                    cursor: "pointer",
                    padding: "5px",
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  {date.slice(0, 10)} / {type}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Right Sidebar: Conditional rendering based on selection */}
      {(selectedLocation ||
        ModalTableData.length > 0 ||
        detailedNotificationData.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "10vh",
            right: "10px",
            padding: "10px",
            border: "2px solid black",
            borderRadius: "10px",
            width: "36%",
            height: "80vh",
            overflowY: "auto",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setSelectedLocation(null);
                setModalTableData([]);
                setDetailedNotificationData([]);
                setHoveredLocations([]); // Reset hovered locations
              }}
            >
              Close
            </Button>
          </div>
          {showDetails && selectedLocation ? (
            <div>
              <div>
                <div
                  id="상자 정보"
                  style={{
                    display: "flex",
                  }}
                >
                  <div
                    id="상자 숫자 정보"
                    style={{
                      width: "45%",
                    }}
                  >
                    <h3>재고함 : {selectedLocation.name}</h3>
                    <b>가로 : {selectedLocation.width}cm</b>
                    <br />
                    <b>세로 : {selectedLocation.height}cm</b>
                    <br />
                    <b>단수(층) : {selectedLocation.z}단/층</b>
                    <br />
                    <b>
                      현재 재고율 :{" "}
                      {extractFillPercentage(selectedLocation.fill)}%{" "}
                    </b>
                  </div>
                  <div
                    id="상자의 z Index를 시각화"
                    style={{
                      marginLeft: "10px",
                      height: "200px",
                      width: "65%",
                      overflowY: "auto",
                      border: "1px solid gray",
                      borderRadius: "5px",
                      padding: "5px",
                      display: "flex",
                      flexDirection: "column-reverse",
                    }}
                  >
                    {Array.from({ length: selectedLocation.z }).map(
                      (_, index) => (
                        <Button
                          key={index + 1}
                          style={{
                            display: "block",
                            width: "90%",
                            height: "30px",
                            backgroundColor:
                              selectedFloor === index + 1 ? "blue" : "white",
                            marginBottom: "5px",
                            borderRadius: "5px",
                            border: "1px solid black",
                            textAlign: "center",
                            lineHeight: "30px",
                            marginLeft: "auto",
                            marginRight: "auto",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            console.log(index + 1 + "층입니다.");
                            setSelectedFloor(
                              selectedFloor === index + 1 ? null : index + 1
                            );
                            handleSelectedData(
                              selectedLocation.name,
                              index + 1
                            );
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor =
                              selectedFloor === index + 1
                                ? "blue"
                                : "lightgray";
                            e.target.style.border = "2px solid red";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor =
                              selectedFloor === index + 1 ? "blue" : "white";
                            e.target.style.border = "1px solid black";
                          }}
                        >
                          {index + 1} 단
                        </Button>
                      )
                    )}
                  </div>
                </div>
                <hr />
                {ModalTableData.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <h3>재고 목록</h3>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <tbody>
                        {ModalTableData.map((item, index) => (
                          <tr
                            key={index}
                            style={{ borderBottom: "1px solid #ccc" }}
                          >
                            <td
                              style={{
                                padding: "10px",
                                width: "70%",
                                fontSize: "18px",
                              }}
                            >
                              <strong>{item.name}</strong>
                              <div style={{ fontSize: "12px", color: "#666" }}>
                                {item.barcode}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "10px",
                                width: "30%",
                                textAlign: "right",
                                fontSize: "16px",
                              }}
                            >
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3>Notification Details</h3>
              {detailedNotificationData.length > 0 ? (
                <MUIDataTable
                  data={detailedNotificationData.map((item) => [
                    item.date,
                    item.productFlowType,
                    item.barcode,
                    item.name,
                    item.quantity,
                    item.currentLocationName,
                    item.currentFloorLevel,
                    item.trackingNumber,
                  ])}
                  columns={notificationColumn}
                />
              ) : (
                <p>세부 정보가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default MyContainerNavigation;

// -----   상자 설정 변경기 영역   ------
const RectangleTransformer = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
}) => {
  const shapeRef = useRef();

  // Local state for hover effect
  const [isHoveredLocal, setIsHoveredLocal] = useState(false);

  // Calculate font size for the text inside the rectangle
  const fontSize = Math.min(shapeProps.width, shapeProps.height) / 4;

  // Text to display on the rectangle
  const mainText = `${shapeProps.name}-${
    shapeProps.z < 10 ? "0" + shapeProps.z : shapeProps.z
  }`;

  // Extract fill percentage from RGBA color
  const extractFillPercentage = (rgbaString) => {
    const matches = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

    if (matches) {
      const red = parseInt(matches[1], 10);
      const green = parseInt(matches[2], 10);

      // Calculate the percentage using both red and green components
      // Both red and green start at a higher value and decrease to 0 as the fill increases
      const redPercentage = (27 - red) / 27;
      const greenPercentage = (177 - green) / 177;

      // The fill percentage is determined by averaging the percentage contribution from red and green
      const fillPercentage = ((redPercentage + greenPercentage) / 2) * 100;

      return fillPercentage.toFixed(1);
    }

    return "0.0"; // Default to 0% if unable to parse
  };

  return (
    <React.Fragment>
      {/* Rectangle shape */}
      <Rect
        onClick={onSelect} // Handle click to select rectangle
        onTap={onSelect} // Handle tap for touch devices
        ref={shapeRef}
        {...shapeProps}
        draggable={false} // Disable dragging
        stroke={isSelected || isHoveredLocal ? "red" : "transparent"} // Border color when selected or hovered
        strokeWidth={isSelected || isHoveredLocal ? 2 : 0} // Border width when selected or hovered
        F
        onMouseEnter={() => setIsHoveredLocal(true)} // Set hover state
        onMouseLeave={() => setIsHoveredLocal(false)} // Reset hover state
      />
      <Text
        text={mainText}
        x={shapeProps.x}
        y={shapeProps.y}
        z={shapeProps.z}
        width={shapeProps.width}
        height={shapeProps.height - fontSize}
        fontSize={Math.min(shapeProps.width, shapeProps.height) / 5}
        fontFamily="Arial"
        fill="white"
        align="center"
        verticalAlign="middle"
        listening={false} // Disable interactions with the text
      />
      <Text
        text={`${extractFillPercentage(shapeProps.fill)}%`}
        x={shapeProps.x}
        y={shapeProps.y}
        z={shapeProps.z}
        width={shapeProps.width}
        height={shapeProps.height + fontSize}
        fontSize={Math.min(shapeProps.width, shapeProps.height) / 5}
        fontFamily="Arial"
        fill="white"
        align="center"
        verticalAlign="middle"
        listening={false} // Disable interactions with the text
      />
    </React.Fragment>
  );
};
