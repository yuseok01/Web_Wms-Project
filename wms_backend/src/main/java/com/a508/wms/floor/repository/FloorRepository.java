package com.a508.wms.floor.repository;

import com.a508.wms.floor.domain.Floor;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FloorRepository extends JpaRepository<Floor, Long> {

    List<Floor> findAllByLocationId(Long locationId);

    @Query("SELECT f FROM Floor f " +
        "JOIN f.location l " +
        "JOIN l.warehouse w " +
        "WHERE w.id = :warehouseID "
        + "AND l.name LIKE '00-00' "
        + " AND f.floorLevel=:floorLevel")
    Floor findByWarehouseId(@Param("warehouseID") Long warehouseID,
        @Param("floorLevel") int floorLevel);

    @Query("SELECT f FROM Floor f WHERE f.floorLevel = :floorLevel " +
        "AND f.location.id = :locationId ")
    Floor findByLocationIdAndFloorLevel(Long locationId, int floorLevel);

    @Query(value =
            "SELECT f.* " +
            "FROM floor f " +
            "JOIN location l ON l.id = f.location_id " +
            "WHERE f.floor_level > 1 " +
            "AND l.warehouse_id = :warehouseId " +
            "ORDER BY substr(l.name,2), substr(l.name from 3), f.floor_level", nativeQuery = true)
    List<Floor> findAllEmptyFloorByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT f FROM Floor f " +
        "JOIN f.Products p " +
        "JOIN f.location l " +
        "JOIN l.warehouse w " +
        "WHERE w.id = :warehouseId "
        + "AND f.floorLevel > 0 "
        + "AND p.quantity>0 ")
    List<Floor> findAllNotEmptyFloorByWarehouseId(@Param("warehouseId") Long warehouseId);


    //SELECT e FROM Employee e
    // LEFT JOIN e.department d
    // WHERE d.name = :departmentName")
}

