import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Html } from '@react-three/drei';
import './App.css';

// 3D 모델 컴포넌트
function CarModel({ batteryStatus, motorStatus }) {
    const { scene } = useGLTF('/tesla_model_s_plaid_2023.glb');
    const modelRef = useRef();

    // useLayoutEffect를 사용하여 모델이 로드된 직후 스케일 조정 (최초 렌더링 시점에 적용)
    // 이전 답변에서 추가된 부분이므로, 필요에 따라 스케일 값을 조정하세요.
    React.useLayoutEffect(() => {
        if (modelRef.current) {
            modelRef.current.scale.set(1, 1, 1);
            // 모델의 모든 하위 메쉬에 그림자 속성을 적용 (핵심)
            scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;   // 모델이 그림자를 드리우도록
                    child.receiveShadow = false; // 모델 자체는 그림자를 받지 않도록 (겹치는 그림자 방지)
                }
            });
        }
    }, [scene]);
    // 상태에 따른 클래스 이름 매핑 함수
    const getStatusClass = (status) => {
        if (status === 0) return 'normal';
        if (status === 1) return 'warning'; // 주의 상태
        if (status === 2) return 'fault';   // 결함 상태
        return ''; // 기본값
    };

    const getStatusText = (status) => {
        if (status === 0) return 'Normal';
        if (status === 1) return 'Warning';
        if (status === 2) return 'Fault';
        return 'Unknown';
    };
    return (
        <group ref={modelRef} dispose={null}>
            <primitive object={scene}/>
            {/* 배터리 상태 표시 */}
            <Html
                position={[-35, 1, -5]} // 차량 좌측 상단 (x, y, z)
                center
                distanceFactor={350} // <--- 이 값을 조정합니다. (기본 10 -> 50으로 증가)
                className="status-label battery-label"
            >
                <div className={`status-box ${getStatusClass(batteryStatus)}`}>
                    <p className="status-text">Battery</p>
                    <p className="status-value">{getStatusText(batteryStatus)}</p>
                </div>
            </Html>
            {/* 모터 상태 표시 */}
            <Html
                position={[40, 1, -5]} // 차량 우측 상단
                center
                distanceFactor={350} // <--- 이 값을 조정합니다. (기본 10 -> 50으로 증가)
                className="status-label motor-label"
            >
                <div className={`status-box ${getStatusClass(motorStatus)}`}>
                    <p className="status-text">Motor</p>
                    <p className="status-value">{getStatusText(motorStatus)}</p>
                </div>
            </Html>
        </group>
    );
}

function App() {
    // 서버에서 받아올 배터리 및 모터 상태 (0: 정상, 1: 비정상)
    const [batteryStatus, setBatteryStatus] = useState(0); // 초기값: 정상
    const [motorStatus, setMotorStatus] = useState(0);    // 초기값: 정상

    // 콘솔에서 호출할 함수들을 전역 window 객체에 노출
    React.useEffect(() => {

         const fetchMotorStatus = async () => {
            try {
                // --- 중요: A 컴퓨터의 내부 IP 주소로 변경하세요! ---
                const serverIpAddress = '192.168.0.19'; // 예: '192.168.0.100'
                const response = await fetch(`http://${serverIpAddress}:5000/predict_motor_status`);

               if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log("Motor status received:", data.motorStatus);
                // 받아온 값이 0, 1, 2 중 하나인지 확인
                if ([0, 1, 2].includes(data.motorStatus)) {
                    setMotorStatus(data.motorStatus); // 상태 업데이트
                } else {
                    console.warn("Invalid motor status value received from server:", data.motorStatus);
                    setMotorStatus(2); // 유효하지 않은 값은 결함으로 처리
                }
            } catch (error) {
                console.error("Failed to fetch motor status:", error);
                setMotorStatus(2); // 오류 발생 시 결함으로 표시 (이전 1 -> 2로 변경)
            }
        }

         // 초기 로드 시 한 번 호출
        fetchMotorStatus();

        // 5초마다 주기적으로 호출 (선택 사항)
        const intervalId = setInterval(fetchMotorStatus, 300000);

         // 콘솔에서 수동으로 상태 변경을 위한 함수 (개발/디버깅용)
        window.setBatteryStatus = (status) => {
            if ([0, 1, 2].includes(status)) {
                setBatteryStatus(status);
                console.log(`배터리 상태 업데이트: ${getStatusText(status)} (${status})`);
            } else {
                console.warn("잘못된 배터리 상태 값입니다. 0, 1, 2 중 하나를 입력하세요.");
            }
        };

        window.setMotorStatus = (status) => {
            if ([0, 1, 2].includes(status)) {
                setMotorStatus(status);
                console.log(`모터 상태 업데이트: ${getStatusText(status)} (${status})`);
            } else {
                console.warn("잘못된 모터 상태 값입니다. 0, 1, 2 중 하나를 입력하세요.");
            }
        };

        return () => {
            // 컴포넌트 언마운트 시 클린업
            clearInterval(intervalId);
            delete window.setBatteryStatus;
            delete window.setMotorStatus;
        };
    }, []); // 빈 배열은 컴포넌트가 마운트될 때 한 번만 실행됨

    // 상태에 따른 CSS 클래스를 반환하는 헬퍼 함수
    const getStatusClass = (status) => {
        if (status === 0) return 'normal';
        if (status === 1) return 'warning';
        if (status === 2) return 'fault';
        return '';
    };

    const getStatusText = (status) => {
        if (status === 0) return 'Normal';
        if (status === 1) return 'Warning';
        if (status === 2) return 'Fault';
        return 'Unknown';
    };
 // 빈 배열은 컴포넌트가 마운트될 때 한 번만 실행됨

    return (
        // 새로운 컨테이너 추가: phone-frame
        <div className="phone-frame">
            {/* 상단 노치 및 상태바 추가 */}
            <div className="notch"></div>
            <div className="status-bar-phone">
                <div className="time-phone">10:15</div> {/* 목업 이미지 시간 */}
                <div className="network-icons-phone">
                    <span className="wifi-icon-phone"></span>
                    <span className="battery-level-phone"></span>
                </div>
            </div>

            {/* 기존 App 컴포넌트 내용을 phone-screen으로 감싸기 */}
            <div className="phone-screen">
                <div className="App">
                    <header className="header">
                        <div className="menu-icon">☰</div>
                        <h1>EV Monitor</h1>
                        <div className="wifi-icon"></div> {/* 이 아이콘은 이제 안쓰이거나, Header 내에서 다시 사용할 수 있음 */}
                    </header>

           <div className="car-3d-container">
                <Canvas camera={{ position: [-230, 150, -250], fov: 30 }} shadows>
                    <ambientLight intensity={0.5} /> {/* 앰비언트 라이트는 그림자 생성을 방해할 수 있으므로 강도를 낮춤 */}
                    {/* 그림자를 드리우는 광원: DirectionalLight를 추천 */}
                    <directionalLight
                        position={[200, 500, -200]} // 광원의 위치 (그림자 방향에 영향)
                        intensity={5} // 광원 강도 (그림자 진하기에 영향)
                        castShadow // 그림자를 드리우도록 설정
                        shadow-mapSize-width={2048} // 그림자 맵 해상도 (높을수록 선명)
                        shadow-mapSize-height={2048}
                        shadow-camera-near={0.5} // 그림자 카메라 절두체
                        shadow-camera-far={500}
                        shadow-camera-left={-2000} // 그림자 카메라 범위 (모델을 충분히 감싸야 함)
                        shadow-camera-right={200}
                        shadow-camera-top={200}
                        shadow-camera-bottom={-200}
                    />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} /> {/* 보조 광원, 그림자 미생성 */}
                    <Suspense fallback={null}>
                        <CarModel batteryStatus={batteryStatus} motorStatus={motorStatus} />
                    </Suspense>
                    <OrbitControls />
                    {/* 그림자를 위한 평면 추가 */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]} receiveShadow> {/* y 값을 더 낮춰 모델 아래로 더 내림 */}
                        <planeGeometry args={[500, 500]} /> {/* 평면 크기를 더 크게 */}
                        <shadowMaterial opacity={0.3} /> {/* 그림자 투명도 조정 */}
                    </mesh>
                </Canvas>
            </div>

                    <div className="status-cards-container">
                        <div className={`status-card ${getStatusClass(batteryStatus)}`}>
                            <div className="icon battery-icon"></div>
                            <div className="text-content">
                                <h3>Battery</h3>
                                <p>{getStatusText(batteryStatus)}</p>
                            </div>
                            <div className={`status-badge ${getStatusClass(batteryStatus)}`}>
                                {getStatusText(batteryStatus)}
                            </div>
                        </div>

                        <div className={`status-card ${getStatusClass(motorStatus)}`}>
                            <div className="icon motor-icon"></div>
                            <div className="text-content">
                                <h3>Motor</h3>
                                <p>{getStatusText(motorStatus)}</p>
                            </div>
                            <div className={`status-badge ${getStatusClass(motorStatus)}`}>
                                {getStatusText(motorStatus)}
                            </div>
                        </div>
                    </div>


                    {/* 모터 상태에 따른 alert 메시지 */}
                    {motorStatus === 1 && ( // 주의 상태일 때 주황색 alert
                        <div className="alert-message warning-alert">
                            <div className="alert-icon"></div>
                            <p>Motor System Warning Detected</p>
                            <div className="arrow-icon"></div>
                        </div>
                    )}
                    {motorStatus === 2 && ( // 결함 상태일 때 노란색 alert
                        <div className="alert-message fault-alert">
                            <div className="alert-icon"></div>
                            <p>Motor System Anomaly Detected</p>
                            <div className="arrow-icon"></div>
                        </div>
                    )}
                    
                    {/* 배터리 상태에 따른 alert 메시지 */}
                    {batteryStatus === 1 && ( // 주의 상태일 때 주황색 alert
                        <div className="alert-message warning-alert">
                            <div className="alert-icon"></div>
                            <p>Battery System Warning Detected</p>
                            <div className="arrow-icon"></div>
                        </div>
                    )}
                    {batteryStatus === 2 && ( // 결함 상태일 때 노란색 alert
                        <div className="alert-message fault-alert">
                            <div className="alert-icon"></div>
                            <p>Battery System Anomaly Detected</p>
                            <div className="arrow-icon"></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
    );
}

export default App;