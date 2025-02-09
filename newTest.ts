type Axis = 'x' | 'y' | 'z';

interface RotationData {
  axis: Axis;
  data: string;
  angle: string;
}

const data: RotationData[] = [{
  'axis': 'x',
  'data': '[1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,-0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '0',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,0.70710678118655,0.70710678118655,0.0,0.0,-0.70710678118655,0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '45',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,6.1232339957368e-17,1.0,0.0,0.0,-1.0,6.1232339957368e-17,0.0,0.0,0.0,0.0,1.0]',
  'angle': '90',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,-0.70710678118655,0.70710678118655,0.0,0.0,-0.70710678118655,-0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '135',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,-1.0,1.2246467991474e-16,0.0,0.0,-1.2246467991474e-16,-1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '180',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,-0.70710678118655,-0.70710678118655,0.0,0.0,0.70710678118655,-0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '225',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,-1.836970198721e-16,-1.0,0.0,0.0,1.0,-1.836970198721e-16,0.0,0.0,0.0,0.0,1.0]',
  'angle': '270',
}, {
  'axis': 'x',
  'data':
    '[1.0,0.0,0.0,0.0,0.0,0.70710678118655,-0.70710678118655,0.0,0.0,0.70710678118655,0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '315',
}, {
  'axis': 'y',
  'data': '[1.0,0.0,-0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '0',
}, {
  'axis': 'y',
  'data':
    '[0.70710678118655,0.0,-0.70710678118655,0.0,0.0,1.0,0.0,0.0,0.70710678118655,0.0,0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '45',
}, {
  'axis': 'y',
  'data':
    '[6.1232339957368e-17,0.0,-1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,6.1232339957368e-17,0.0,0.0,0.0,0.0,1.0]',
  'angle': '90',
}, {
  'axis': 'y',
  'data':
    '[-0.70710678118655,0.0,-0.70710678118655,0.0,0.0,1.0,0.0,0.0,0.70710678118655,0.0,-0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '135',
}, {
  'axis': 'y',
  'data':
    '[-1.0,0.0,-1.2246467991474e-16,0.0,0.0,1.0,0.0,0.0,1.2246467991474e-16,0.0,-1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '180',
}, {
  'axis': 'y',
  'data':
    '[-0.70710678118655,0.0,0.70710678118655,0.0,0.0,1.0,0.0,0.0,-0.70710678118655,0.0,-0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '225',
}, {
  'axis': 'y',
  'data':
    '[-1.836970198721e-16,0.0,1.0,0.0,0.0,1.0,0.0,0.0,-1.0,0.0,-1.836970198721e-16,0.0,0.0,0.0,0.0,1.0]',
  'angle': '270',
}, {
  'axis': 'y',
  'data':
    '[0.70710678118655,0.0,0.70710678118655,0.0,0.0,1.0,0.0,0.0,-0.70710678118655,0.0,0.70710678118655,0.0,0.0,0.0,0.0,1.0]',
  'angle': '315',
}, {
  'axis': 'z',
  'data': '[1.0,0.0,0.0,0.0,-0.0,1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '0',
}, {
  'axis': 'z',
  'data':
    '[0.70710678118655,0.70710678118655,0.0,0.0,-0.70710678118655,0.70710678118655,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '45',
}, {
  'axis': 'z',
  'data':
    '[6.1232339957368e-17,1.0,0.0,0.0,-1.0,6.1232339957368e-17,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '90',
}, {
  'axis': 'z',
  'data':
    '[-0.70710678118655,0.70710678118655,0.0,0.0,-0.70710678118655,-0.70710678118655,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '135',
}, {
  'axis': 'z',
  'data':
    '[-1.0,1.2246467991474e-16,0.0,0.0,-1.2246467991474e-16,-1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '180',
}, {
  'axis': 'z',
  'data':
    '[-0.70710678118655,-0.70710678118655,0.0,0.0,0.70710678118655,-0.70710678118655,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '225',
}, {
  'axis': 'z',
  'data':
    '[-1.836970198721e-16,-1.0,0.0,0.0,1.0,-1.836970198721e-16,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '270',
}, {
  'axis': 'z',
  'data':
    '[0.70710678118655,-0.70710678118655,0.0,0.0,0.70710678118655,0.70710678118655,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0]',
  'angle': '315',
}];

// 許容誤差
const EPSILON = 1e-6;

// 角度をラジアンに変換
const toRadians = (angle: number): number => (angle * Math.PI) / 180;

// x軸周りの回転行列
const rotationMatrixX = (angle: number): number[] => {
  const rad = toRadians(angle);
  return [
    1,
    0,
    0,
    0,
    0,
    Math.cos(rad),
    Math.sin(rad),
    0,
    0,
    -Math.sin(rad),
    Math.cos(rad),
    0,
    0,
    0,
    0,
    1,
  ];
};

// y軸周りの回転行列
const rotationMatrixY = (angle: number): number[] => {
  const rad = toRadians(angle);
  return [
    Math.cos(rad),
    0,
    -Math.sin(rad),
    0,
    0,
    1,
    0,
    0,
    Math.sin(rad),
    0,
    Math.cos(rad),
    0,
    0,
    0,
    0,
    1,
  ];
};

// z軸周りの回転行列
const rotationMatrixZ = (angle: number): number[] => {
  const rad = toRadians(angle);
  return [
    Math.cos(rad),
    Math.sin(rad),
    0,
    0,
    -Math.sin(rad),
    Math.cos(rad),
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ];
};

// 配列の比較（誤差を考慮）
const arraysAreEqual = (arr1: number[], arr2: number[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (Math.abs(arr1[i] - arr2[i]) > EPSILON) {
      return false;
    }
  }
  return true;
};

// 回転行列からピッチ、ヨー、ロールを計算（左手系座標系対応）
const extractEulerAngles = (
  matrix: number[],
): { yaw: number; pitch: number; roll: number } => {
  let yaw, pitch, roll;

  // ピッチの計算
  pitch = -Math.atan2(matrix[9], matrix[5]); // asin(-R31)

  if (Math.abs(matrix[9]) < 1 - EPSILON) {
    // 通常ケース
    roll = -Math.atan2(matrix[1], matrix[5]); // atan2(R12, R11)
  } else {
    // Gimbal Lockのケース
    roll = 0;
  }

  yaw = -Math.atan2(matrix[2], matrix[10]); // Yaw は変更しない

  return { yaw, pitch, roll };
};

// データをテスト
for (const entry of data) {
  const angle = parseFloat(entry.angle);
  const targetMatrix = JSON.parse(entry.data) as number[];

  let calculatedMatrix: number[];
  switch (entry.axis) {
    case 'x':
      calculatedMatrix = rotationMatrixX(angle);
      break;
    case 'y':
      calculatedMatrix = rotationMatrixY(angle);
      break;
    case 'z':
      calculatedMatrix = rotationMatrixZ(angle);
      break;
    default:
      throw new Error(`Unknown axis: ${entry.axis}`);
  }

  if (arraysAreEqual(calculatedMatrix, targetMatrix)) {
    console.log(`Match found for axis: ${entry.axis}, angle: ${angle}`);
  } else {
    console.log(`No match for axis: ${entry.axis}, angle: ${angle}`);
  }

  // ピッチ、ヨー、ロールを計算して出力
  const { yaw, pitch, roll } = extractEulerAngles(targetMatrix);
  console.log(
    `Euler angles for axis: ${entry.axis}, angle: ${angle} -> Yaw: ${
      (yaw * 180) / Math.PI
    }°, Pitch: ${(pitch * 180) / Math.PI}°, Roll: ${(roll * 180) / Math.PI}°`,
  );
}
