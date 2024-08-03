package com.a508.wms.auth.config;

import com.a508.wms.auth.filter.JwtAuthenticationFilter;
import com.a508.wms.auth.handler.ValidationExceptionHandler;
import com.a508.wms.user.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.config.annotation.web.configurers.HttpBasicConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration // 빈 메서드
@EnableWebSecurity // 웹 보안 활성화
@RequiredArgsConstructor // 필터 의존성 주입
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final DefaultOAuth2UserService oAuth2UserService;

    /**
     * 보안 필터 체인을 구성합니다.
     *
     * @param httpSecurity HttpSecurity 객체
     * @return SecurityFilterChain 객체
     * @throws Exception 예외
     */
    @Bean
    protected SecurityFilterChain configure(HttpSecurity httpSecurity,
        ValidationExceptionHandler validationExceptionHandler, UserService userService) throws Exception {

        httpSecurity
            .cors(cors -> cors
                .configurationSource(corsConfigurationSource())
            )
            .csrf(CsrfConfigurer::disable)
            .httpBasic(HttpBasicConfigurer::disable)
            .sessionManagement(sessionManagement -> sessionManagement
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(request -> request
                .requestMatchers("/api/v1/auth/**", "/oauth2/**").permitAll() // 자체 로그인 및 회원가입 경로
                .requestMatchers("/oauth2/authorization/**").permitAll()
                .requestMatchers("/api/v1/social/**").authenticated() // 소셜 로그인 경로
                .anyRequest().permitAll()
            )
            .oauth2Login(oauth2 -> oauth2
                .redirectionEndpoint(endpoint -> endpoint.baseUri("/oauth2/code/*"))
                .userInfoEndpoint(endPoint -> endPoint.userService(oAuth2UserService))
            )
            .exceptionHandling(exceptionHandling -> exceptionHandling
                .authenticationEntryPoint(new FailedAuthenticationEntryPoint())
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return httpSecurity.build();
    }
    /**
     * 요청 권한 설정
     *             .authorizeHttpRequests(request -> request
     *                 // "/" 및 "/api/v1/auth/**" 경로를 허가
     *                 .requestMatchers("/", "/**").permitAll()
     *                 // "/api/v1/admin/**" 경로에 "ADMIN" 역할 필요
     *                 .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
     *                 // "/api/v1/user/**" 경로에 "USER" 역할 필요
     *                 .requestMatchers("/api/v1/user/**").hasRole("USER")
     *                 // 나머지 모든 요청은 인증 필요
     *                 .anyRequest().authenticated()
     *             )
     *             // 인증 실패 처리
     *             .exceptionHandling(exceptionHandling -> exceptionHandling
     *                 .authenticationEntryPoint(new FailedAuthenticationEntryPoint()))
     *             // JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 추가
     *             .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
     */

    /**
     * CORS 설정을 구성합니다.
     *
     * @return CorsConfigurationSource 객체
     */
    @Bean
    protected CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 모든 도메인을 허용
        configuration.addAllowedOrigin("*");
        // 모든 헤더를 허용
        configuration.addAllowedHeader("*");
        // 모든 HTTP 메서드를 허용
        configuration.addAllowedMethod("*");
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 모든 경로에 대해 위의 설정을 적용
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}

/**
 * 인증 실패 시 처리할 클래스입니다.
 */
class FailedAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
        AuthenticationException authException) throws IOException, ServletException {
        // 응답의 콘텐츠 타입을 JSON으로 설정
        response.setContentType("application/json");
        // 응답 상태를 403 (Forbidden)으로 설정
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        // JSON 형식의 에러 메시지를 응답 본문에 작성
        response.getWriter().write("{\"code\":\"NP\" , \"message\":\"No Permission.\"}");
    }
}
