import React, { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header/SelectHeader";
import HeaderLinks from "/components/Header/SelectHeaderLinks.js";
import { makeStyles } from "@material-ui/core/styles";
import AddCircleOutline from "@material-ui/icons/AddCircleOutline";
import GridContainer from "/components/Grid/GridContainer.js";
import GridItem from "/components/Grid/GridItem.js";
import Card from "/components/Card/Card.js";
import { Modal, Fade, Button, TextField } from "@mui/material";
import { useRouter } from "next/router"; // useRouter 훅 임포트
import styles from "/styles/jss/nextjs-material-kit/pages/componentsSections/selectStyle.js";

const useStyles = makeStyles(styles);

const Select = (props) => {
  const { ...rest } = props;
  const classes = useStyles();
  const router = useRouter(); // useRouter 훅으로 라우터 객체 초기화

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    containerName: "",
    containerSize: "",
    locationX: "",
    locationY: "",
    locationZ: "",
    row: "",
    column: "",
  });

  const [cards, setCards] = useState([]);
  const [userData, setUserData] = useState(null); // State to store user data
  const [businessData, setBusinessData] = useState(null); // State to store business data
  const [businessId, setBusinessId] = useState(null); // State to store business ID
  const [currentWarehouseCount, setCurrentWarehouseCount] = useState(0);
  const [allowedWarehouseCount, setAllowedWarehouseCount] = useState(0);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchWarehouseCounts = async () => {
    try {
      const warehouseCountResponse = await fetch(
        `https://i11a508.p.ssafy.io/api/warehouses/cnt/${businessId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const subscriptionResponse = await fetch(
        `https://i11a508.p.ssafy.io/api/subscriptions?businessId=${businessId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (warehouseCountResponse.ok && subscriptionResponse.ok) {
        const warehouseCountData = await warehouseCountResponse.json();
        const subscriptionData = await subscriptionResponse.json();

        setCurrentWarehouseCount(warehouseCountData.result);
        setAllowedWarehouseCount(subscriptionData.result[0].warehouseCount);
      } else {
        console.error("Error fetching warehouse or subscription data");
      }
    } catch (error) {
      console.error("Error fetching warehouse or subscription data:", error);
    }
  };

  // 입력된 창고 정보를 바탕으로 새로운 창고를 만드는 메서드 (클릭시 작용)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!businessId) {
      console.error("Business ID is missing");
      return;
    }

    await fetchWarehouseCounts();

    if (currentWarehouseCount > allowedWarehouseCount) {
      alert("추가 생성을 위한 결제가 필요합니다.");
      router.push("/payment"); // router.push로 페이지 이동
      return;
    }

    // 창고 생성을 위한 데이터
    const postData = {
      businessId, // Use the stored business ID
      size: parseInt(formData.containerSize), // Ensure size is a number
      columnCount: parseInt(formData.column), // Ensure columnCount is a number
      rowCount: parseInt(formData.row), // Ensure rowCount is a number
      name: formData.containerName || `Container ${cards.length + 1}`,
      priority: 1, // Default priority
      facilityTypeEnum: "STORE", // Default facility type
    };

    // 창고 내의 로케이션 생성을 위한 데이터 추출
    const { locationX, locationY, locationZ, row, column } = formData;

    // Calculate spacing between locations

    const xSpacing = postData.size / row / 2;
    const ySpacing = postData.size / column / 2;

    // Location(적재함) 생성
    const locationData = [];
    for (let i = 0; i < row; i++) {
      for (let j = 0; j < column; j++) {
        // Format row and column numbers as two-digit strings
        const rowNumber = (i + 1).toString().padStart(2, "0"); // Convert to string and pad with zeros
        const columnNumber = (j + 1).toString().padStart(2, "0"); // Convert to string and pad with zeros

        locationData.push({
          xPosition: Math.round(j * xSpacing + xSpacing / 2 - locationX / 2),
          yPosition: Math.round(i * ySpacing + ySpacing / 2 - locationY / 2),
          zSize: parseInt(locationZ),
          xSize: Math.round(parseInt(locationX)),
          ySize: Math.round(parseInt(locationY)),
          name: `${rowNumber}-${columnNumber}`, // Use formatted row and column numbers
          productStorageType: "상온",
          rotation: 0,
          touchableFloor : 2,
        });
      }
    }
    // walls(벽) 생성
    const wallData = generateWalls(locationData);

    try {
      const response = await fetch(
        "https://i11a508.p.ssafy.io/api/warehouses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        }
      );

      if (response.ok) {
        const newWarehouse = await response.json();
        const warehouses = newWarehouse.result;

        const warehousesId = warehouses.id;

        // 창고가 생성되면 해당 창고에 자동 로케이션 설정에 들어간다.
        postLocationAPI(locationData, warehousesId);
        postWallAPI(wallData, warehousesId);

        // card 섹션 추가
        console.log("New warehouse created:", newWarehouse);

        // Optionally update the cards state to reflect the new warehouse
        const newCard = {
          id: newWarehouse.result.id, // Assuming the API returns the new warehouse ID
          title: newWarehouse.result.name,
          image: "/img/bg.jpg", // Replace with an actual image path if available
        };

        setCards((prev) => [...prev, newCard]);
        handleClose();
      } else {
        console.error("Error creating new warehouse");
      }
    } catch (error) {
      console.error("Error creating new warehouse:", error);
    }
  };

  // Function to generate walls around locations
  // Function to generate a perimeter wall around all locations
  const generateWalls = (generatedLocations) => {
    if (generatedLocations.length === 0) return null;

    // Calculate the bounding box for the new locations
    let minX = Number.MAX_VALUE,
      minY = Number.MAX_VALUE,
      maxX = 0,
      maxY = 0;

    generatedLocations.forEach((location) => {
      minX = Math.min(minX, location.xPosition);
      minY = Math.min(minY, location.yPosition);
      maxX = Math.max(maxX, location.xPosition + location.xSize);
      maxY = Math.max(maxY, location.yPosition + location.ySize);
    });

    // 벽 데이터를 기록합니다.
    const wallData = [
      { startX: minX, startY: minY, endX: maxX, endY: minY },
      { startX: maxX, startY: minY, endX: maxX, endY: maxY },
      { startX: maxX, startY: maxY, endX: minX, endY: maxY },
      { startX: minX, startY: maxY, endX: minX, endY: minY },
    ];

    return wallData;
  };

  // 생성된 된정보를 API를 통해 보냄
  const postLocationAPI = async (requests, warehouseId) => {
    
    console.log("로케이션");

    const total = {requests, warehouseId};
    console.log(total);

    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/locations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(total),
        }
      );

      if (response.ok) {
        console.log("Location data saved successfully");
      } else {
        console.error("Error saving map data");
      }
    } catch (error) {
      console.error("Error saving map data:", error);
    }
  };
  // 생성된 된정보를 API를 통해 보냄
  const postWallAPI = async (wallDtos, warehouseId) => {

    console.log("벽");
    const total = {wallDtos, warehouseId};
    console.log(total);

    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/warehouses/walls`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(total),
        }
      );

      if (response.ok) {
        console.log("Walls data saved successfully");
      } else {
        console.error("Error saving map data");
      }
    } catch (error) {
      console.error("Error saving map data:", error);
    }
  };

  // API call to fetch warehouse information // 해당 비즈니스 아이디의 창고 정보
  const getAllWarehouseInfoAPI = async (businessId) => {
    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/warehouses?businessId=${businessId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const apiConnection = await response.json();
        console.log(apiConnection)
        const warehouses = apiConnection.result;

        const warehouseCards = warehouses.map((warehouse) => ({
          id: warehouse.id,
          title: warehouse.name,
          image: "/img/bg.jpg",
        }));

        setCards(warehouseCards);
      } else {
        console.error("Error loading warehouse data");
      }
    } catch (error) {
      console.error("Error loading warehouse data:", error);
    }
  };

  const fetchBusinessData = async (userId) => {
    try {
      const response = await fetch(
        `https://i11a508.p.ssafy.io/api/users/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        const businessInfo = userData.result;
        setBusinessData(businessInfo); // Store business data in state
        setBusinessId(businessInfo.businessId); // Store business ID
        console.log("Business data loaded:", businessInfo);

        // Now call the warehouse info API with the business ID
        getAllWarehouseInfoAPI(businessInfo.businessId);
      } else {
        console.error("Error fetching user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  /**
   * UseEffect Part
   */

  useEffect(() => {
    // Retrieve user data from localStorage
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        setUserData(parsedUser);
        console.log("User data loaded from localStorage:", parsedUser);

        // Fetch business data using user ID
        fetchBusinessData(parsedUser.id);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <Header
        brand="FIT-BOX"
        rightLinks={<HeaderLinks />}
        fixed
        color="white"
        opacity="0.5"
        changeColorOnScroll={{
          height: 400,
          color: "white",
        }}
        {...rest}
      />

      {/* Card Section */}
      <div className={classes.section}>
        <div className={classes.container}>
          <h3>창고를 선택하세요.</h3>
          <GridContainer>
            {/* Image Card */}
            {cards.map((card) => (
              <GridItem key={card.id} xs={12} sm={12} md={4}>
                <Link href={`/user/${card.id}`} passHref>
                  <Card
                    component="a"
                    className={`${classes.cardLink} ${classes.imageCard}`}
                  >
                    <img
                      src={card.image}
                      alt="Card image"
                      className={classes.cardImage}
                    />
                    <div>
                      <h4>{card.title}</h4>
                    </div>
                  </Card>
                </Link>
              </GridItem>
            ))}
            {/* Plus Button Card */}
            <GridItem xs={12} sm={12} md={4} className={classes.plusCard}>
              <div className={classes.buttonCard} onClick={handleOpen}>
                <AddCircleOutline className={classes.plusButton} />
              </div>
            </GridItem>
          </GridContainer>
          {/* Modal for input form */}
          <Modal
            className={classes.modal}
            open={open}
            onClose={handleClose}
            closeAfterTransition
          >
            <Fade
              in={open}
              style={{
                justifyContent: "center",
              }}
            >
              <div className={classes.paper}>
                <h2>새 창고 정보 입력</h2>
                <form onSubmit={handleSubmit}>
                  <TextField
                    name="containerName"
                    label="창고 이름"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.containerName}
                    onChange={handleChange}
                  />
                  <TextField
                    name="containerSize"
                    label="창고 크기"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.containerSize}
                    onChange={handleChange}
                  />
                  <TextField
                    name="locationX"
                    label="Location(적재함) 가로 크기"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.locationX}
                    onChange={handleChange}
                  />
                  <TextField
                    name="locationY"
                    label="Location(적재함) 세로 크기"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.locationY}
                    onChange={handleChange}
                  />
                  <TextField
                    name="locationZ"
                    label="Location(적재함) 층수"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.locationZ}
                    onChange={handleChange}
                  />
                  <TextField
                    name="row"
                    label="행"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.row}
                    onChange={handleChange}
                  />
                  <TextField
                    name="column"
                    label="열"
                    fullWidth
                    variant="outlined"
                    className={classes.formControl}
                    value={formData.column}
                    onChange={handleChange}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                  >
                    Finish
                  </Button>
                </form>
              </div>
            </Fade>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Select;
