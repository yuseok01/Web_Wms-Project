import React, { useEffect, useState } from "react";
import classNames from "classnames";
import Link from "next/link";
import { makeStyles } from "@material-ui/core/styles";
import Header from "/components/Header/UserHeader.jsx";
import HeaderLinks from "/components/Header/UserHeaderLinks.js";
import Footer from "/components/Footer/Footer.js";
import Button from "/components/CustomButtons/Button.js";
import Parallax from "/components/Parallax/ParallaxUser.js";
import dynamic from "next/dynamic";
import styles from "/styles/jss/nextjs-material-kit/pages/users.js";
import AOS from "aos";
import "aos/dist/aos.css";
import { useRouter } from "next/router";

const DynamicMyContainerMap = dynamic(
  () => import("/pages-sections/Components-Sections/MyContainerMap.jsx"),
  { ssr: false }
);
const DynamicMyContainerNavigation = dynamic(
  () => import("/pages-sections/Components-Sections/MyContainerNavigation.jsx"),
  { ssr: false }
);
const DynamicMyContainerProduct = dynamic(
  () => import("/pages-sections/Components-Sections/MyContainerProduct.jsx"),
  { ssr: false }
);

const useStyles = makeStyles((theme) => ({
  ...styles,
  sidebar: {
    width: "90px",
    height: "100vh",
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: "#f7f7f7",
    padding: "5px 5px 15px 5px",
    boxShadow: "2px 0 5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 1200,
  },
  content: {
    padding: "20px",
  },
  currentWarehouseIndex: {
    fontSize: "12px",
  },
  currentWarehouse: {
    marginBottom: "20px",
    fontWeight: "bold",
  },
  mainContent: {
    marginLeft: "90px",
    // height: "100vh",
    overflow: "none",
  },
  warehouseDropdown: {
    margin: "10px 0",
  },
  warehouseSelect: {
    width: "100%",
    padding: "5px",
    fontSize: "12px",
    fontWeight: "bold",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
    cursor: "pointer",
    appearance: "none",
    whiteSpace: "normal",
  },
  warehouseOption: {
    fontSize: "12px",
    fontWeight: "bold",
    lineHeight: "1.2",
    whiteSpace: "normal",
    overflow: "hidden",
    padding: "10px",
  },
}));

export default function Components(props) {
  const classes = useStyles();
  const { ...rest } = props;
  const router = useRouter();
  const { id } = router.query;

  const [cards, setCards] = useState([]);
  const [userData, setUserData] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(id || "");

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
        console.log(apiConnection);
        const warehouses = apiConnection.result;

        const warehouseCards = warehouses.map((warehouse) => ({
          id: warehouse.id,
          title: warehouse.name,
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
        setBusinessData(businessInfo);
        console.log("Business data loaded:", businessInfo);

        getAllWarehouseInfoAPI(businessInfo.businessId);
      } else {
        console.error("Error fetching user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        setUserData(parsedUser);
        console.log("User data loaded from localStorage:", parsedUser);

        fetchBusinessData(parsedUser.id);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);

  const componentsArray = userData
    ? [
        <DynamicMyContainerMap
          key={`map-${selectedWarehouse}`}
          warehouseId={selectedWarehouse}
          businessId={userData.businessId}
        />,
        <DynamicMyContainerNavigation
          key={`nav-${selectedWarehouse}`}
          WHId={selectedWarehouse}
          businessId={userData.businessId}
        />,
        <DynamicMyContainerProduct
          key={`product-${selectedWarehouse}`}
          WHId={selectedWarehouse}
          businessId={userData.businessId}
        />,
      ]
    : [];

  const handleNextComponent = (index) => {
    setCurrentIndex(index);
  };

  const handleWarehouseChange = (event) => {
    const warehouseId = event.target.value;
    setSelectedWarehouse(warehouseId);
    router.push(`/user/${warehouseId}`, undefined, { shallow: true });
  };

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (user) {
      try {
        const parsedUser = JSON.parse(user);
        setUserData(parsedUser);
        console.log("User[id]에서 불러오기", parsedUser);
      } catch (error) {
        router.push("/");
      }
    }
  }, [selectedWarehouse]);

  return (
    <div>
      <Header
        rightLinks={<HeaderLinks />}
        fixed
        color="rgba(237, 237, 237, 0.8)"
        {...rest}
      />
      <div className={classes.sidebar}>
        <button>
          <Link href="/components" as="/components">
            <img
              style={{ height: "30px", width: "60px", paddingRight: "15px" }}
              src="/img/logo1.png"
              alt="logo"
            />
          </Link>
        </button>
        <br />
        <div className={classes.currentWarehouseIndex}>현재 창고</div>
        <div className={classes.warehouseDropdown}>
          <select
            className={classes.warehouseSelect}
            value={selectedWarehouse}
            onChange={handleWarehouseChange}
          >
            <option value="" disabled>
              창고를 선택하세요
            </option>
            {cards.map((warehouse) => (
              <option
                key={warehouse.id}
                value={warehouse.id}
                className={classes.warehouseOption}
              >
                {warehouse.title}
              </option>
            ))}
          </select>
        </div>
        <Button color="primary" round onClick={() => handleNextComponent(0)}>
          창고 관리
        </Button>
        <Button color="info" round onClick={() => handleNextComponent(1)}>
          재고 현황
        </Button>
        <Button color="success" round onClick={() => handleNextComponent(2)}>
          재고 관리
        </Button>
      </div>

      <div className={classes.mainContent}>
        {componentsArray.length > 0 ? (
          componentsArray[currentIndex]
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </div>
  );
}
