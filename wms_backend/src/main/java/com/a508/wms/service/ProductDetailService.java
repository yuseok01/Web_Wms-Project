package com.a508.wms.service;

import com.a508.wms.domain.Business;
import com.a508.wms.domain.Product;
import com.a508.wms.domain.ProductDetail;
import com.a508.wms.domain.ProductLocation;
import com.a508.wms.domain.ProductStorageType;
import com.a508.wms.dto.ProductDetailRequestDto;
import com.a508.wms.dto.ProductDetailResponseDto;
import com.a508.wms.repository.BusinessRepository;
import com.a508.wms.repository.ProductDetailRepository;
import com.a508.wms.repository.ProductLocationRepository;
import com.a508.wms.repository.ProductRepository;
import com.a508.wms.repository.ProductStorageTypeRepository;
import com.a508.wms.util.constant.StatusEnum;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductDetailService {

    private final ProductDetailRepository productDetailRepository;
    private final BusinessRepository businessRepository;
    private final ProductStorageTypeRepository productStorageTypeRepository;
    private final ProductRepository productRepository;
    private final ProductLocationRepository productLocationRepository;


    /**
     * 서비스 전체 상품 정보를 반환함.
     *
     * @return
     */
    public List<ProductDetailResponseDto> getProductDetail() {
        List<ProductDetail> result = productDetailRepository.findAll();

        return result.stream()
            .map(ProductDetailResponseDto::fromProductDetail)
            .toList();
    }


    /**
     * 사업체에 해당하는 상품정보 반환
     *
     * @param id: 사업체 ID
     * @return
     */

    public List<ProductDetailResponseDto> getProductDetailByBusinessId(Long id) {
        List<ProductDetail> result = productDetailRepository.findByBusinessId(id);

        return result.stream()
            .map(ProductDetailResponseDto::fromProductDetail)
            .toList();
    }

    /**
     * 해당하는 사업체와 저장 타입을 가져와서 이를 통해 상품정보를 저장하는 기능
     *
     * @param request 상품 정보
     */
    public ProductDetailResponseDto save(ProductDetailRequestDto request) {
        log.info("product detail request: {}", request);
        Business business = businessRepository.findById(request.getBusinessId())
            .orElseThrow(() -> new IllegalArgumentException("Invalid business Id"));

        ProductStorageType productStorageType = productStorageTypeRepository.findById(
                request.getProductStorageTypeId())
            .orElseThrow(() -> new IllegalArgumentException("Invalid productStorageType Id"));

        ProductDetail productDetail = new ProductDetail(
            business, productStorageType, request.getBarcode(),
            request.getName(), request.getSize(), request.getUnit(),
            request.getOriginalPrice(), request.getSellingPrice()
        );

        log.info(productDetail.toString());

        ProductDetail savedProductDetail = productDetailRepository.save(productDetail);

        return ProductDetailResponseDto.fromProductDetail(savedProductDetail);
    }

    /**
     * 기존 상품 정보를 불러와서 수정하는 기능, 미입력값에 대해서는 기존 값으로 처리한다
     *
     * @param id      상품 정보 ID
     * @param request 상품 정보 수정 Data
     */
    public void modify(Long id, ProductDetailRequestDto request) {
        log.info("product detail request: {}", request);
        ProductDetail productDetail = productDetailRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Invalid productDetail Id"));

        ProductStorageType productStorageType = productStorageTypeRepository.findById(
                request.getProductStorageTypeId())
            .orElseThrow(() -> new IllegalArgumentException("Invalid productStorageType Id"));

        log.info("product detail target: {}", productDetail);

        productDetail.updateData(
            productStorageType,
            request.getBarcode(),
            request.getName(),
            (request.getSize() == null) ? productDetail.getSize() : request.getSize(),
            (request.getUnit() == null) ? productDetail.getUnit() : request.getUnit(),
            (request.getOriginalPrice() == 0) ? productDetail.getOriginalPrice()
                : request.getOriginalPrice(),
            (request.getSellingPrice() == 0) ? productDetail.getSellingPrice()
                : request.getSellingPrice()
        );

        productDetailRepository.save(productDetail);
    }

    /**
     * 상품 정보의 상태값을 삭제로 변경, 해당 상품정보에 연관되는 모든 데이터의 상태 또한 삭제로 변경
     *
     * @param id 상품 정보 ID
     */
    @Transactional
    public void delete(Long id) {
        log.info("product detail request: {}", id);
        ProductDetail productDetail = productDetailRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Invalid ProductDetail ID"));

        productDetail.updateStatus(StatusEnum.DELETED);

        for (Product product : productDetail.getProducts()) {
            product.updateStatus(StatusEnum.DELETED);

            productRepository.save(product);

            for (ProductLocation productLocation : product.getProductLocations()) {
                productLocation.updateStatus(StatusEnum.DELETED);
                productLocationRepository.save(productLocation);
            }
        }
    }
}
