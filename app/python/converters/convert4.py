import os
import re
import matplotlib.pyplot as plt
from typing import List, Tuple, Dict

# 定义常量
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOC_DIR = os.path.join(SCRIPT_DIR, "doc")

# 文件路径配置
FILE_PATHS = {
    "up_upper": os.path.join(DOC_DIR, "G8360-TEST-TOP-JIGUNIT1.rut"),
    "up_middle": os.path.join(DOC_DIR, "G8360-TEST-TOP-JIGUNIT2.rut"),
    "up_bottom": os.path.join(DOC_DIR, "up-bottom.rut"),
    "down_upper": os.path.join(DOC_DIR, "G8360-TEST-BOT-JIGUNIT1.rut"),
    "down_middle": os.path.join(DOC_DIR, "G8360-TEST-BOT-JIGUNIT2.rut"),
    "down_bottom": os.path.join(DOC_DIR, "G8360-TEST-BOT-JIGUNIT3.rut"),
    "adr_file": os.path.join(DOC_DIR, "G8360-TEST.ADR")
}

class PinPoint:
    def __init__(self, no: int, x: float, y: float, side: str):
        self.no = no
        self.x = x
        self.y = y
        self.side = side

def read_rut_file_for_offset(file_path: str) -> Tuple[float, float]:
    """从.RUT文件中读取偏移量"""
    x_offset, y_offset = 0.0, 0.0
    try:
        with open(file_path, "r") as file:
            for line in file:
                if "(OFFSET-X:" in line:
                    x_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                elif "(OFFSET-Y:" in line:
                    y_offset = float(re.search(r"[-+]?\d*\.\d+|\d+", line).group())
                    break
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Using default offset (0,0).")
    return x_offset, y_offset

def extract_coordinates(file_path: str) -> List[Tuple[float, float]]:
    """从.RUT文件中提取坐标点"""
    coordinates = []
    try:
        with open(file_path, "r") as file:
            for line in file:
                if line.startswith("G01") or line.startswith("G00"):
                    match = re.search(r"X(-?\d+\.\d+)Y(-?\d+\.\d+)", line)
                    if match:
                        x, y = map(float, match.groups())
                        coordinates.append((x, y))
    except FileNotFoundError:
        print(f"Warning: File not found at {file_path}. Returning empty coordinates.")
    except Exception as e:
        print(f"Error reading file {file_path}: {e}. Returning empty coordinates.")
    return coordinates

def calculate_intersection_point(coord1: Tuple[float, float], 
                                 coord2: Tuple[float, float], 
                                 coord3: Tuple[float, float], 
                                 coord4: Tuple[float, float]) -> Tuple[float, float]:
    """计算两条线段的交点"""
    # 计算斜率和截距
    try:
        k1 = (coord2[1] - coord1[1]) / (coord2[0] - coord1[0])
    except ZeroDivisionError:
        k1 = float("inf")
    
    b1 = coord1[1] - k1 * coord1[0] if k1 != float("inf") else None
    
    try:
        k2 = (coord4[1] - coord3[1]) / (coord4[0] - coord3[0])
    except ZeroDivisionError:
        k2 = float("inf")
    
    b2 = coord3[1] - k2 * coord3[0] if k2 != float("inf") else None 

    # 计算交点坐标
    if k1 == k2:
        raise ValueError("两条线平行或重合，无法计算交点")
    elif k1 == float("inf"):  # 第一条线垂直
        x_intersection = coord1[0]
        y_intersection = k2 * x_intersection + b2
    elif k2 == float("inf"):  # 第二条线垂直
        x_intersection = coord3[0]
        y_intersection = k1 * x_intersection + b1
    else:
        x_intersection = (b2 - b1) / (k1 - k2)
        y_intersection = k1 * x_intersection + b1

    # 检查交点是否在线段上
    def is_between(a: float, b: float, c: float) -> bool:
        """检查c是否在a和b之间"""
        return min(a, b) <= c <= max(a, b)

    if (
        is_between(coord1[0], coord2[0], x_intersection)
        and is_between(coord1[1], coord2[1], y_intersection)
        and is_between(coord3[0], coord4[0], x_intersection)
        and is_between(coord3[1], coord4[1], y_intersection)
    ):  
        return x_intersection, y_intersection
    else:
        raise ValueError("交点不在线段上")

def process_jig_unit(raw_coords: List[Tuple[float, float]], 
                     x_offset: float, 
                     y_offset: float, 
                     jig_name: str = "") -> List[Tuple[float, float]]:
    """
    处理治具单元，实现"切角"逻辑以消除"小三角"
    
    Args:
        raw_coords: 原始的G代码坐标列表
        x_offset: X轴偏移量
        y_offset: Y轴偏移量
        jig_name: 治具的名称，用于打印日志
    
    Returns:
        处理完成的坐标列表。如果处理失败，则返回一个空列表。
    """
    # 安全检查：至少需要4个点才能定义两条线段
    if not raw_coords or len(raw_coords) < 4:
        if raw_coords and len(raw_coords) >= 2:
            processed = raw_coords[:]
            if processed[-1] != processed[0]:
                processed.append(processed[0])
            return [(x - x_offset, y - y_offset) for x, y in processed]
        return []

    processed_coords = []
    try:
        # 尝试计算交点
        intersection = calculate_intersection_point(
            raw_coords[0], raw_coords[1],
            raw_coords[-2], raw_coords[-1]
        )
        print(f"Info [{jig_name}]: 交点计算成功 -> {intersection}")

        # 如果交点计算成功，进行切片和重组
        processed_coords = [intersection] + raw_coords[1:-1] + [intersection]

    except ValueError as e:
        # 如果交点计算失败，采取备用方案：直接闭合原始图形
        print(f"Warning [{jig_name}]: 交点计算失败 ({e})。将使用原始坐标直接闭合。")
        processed_coords = raw_coords[:]  # 复制一份，避免修改原始列表
        if processed_coords[-1] != processed_coords[0]:
            processed_coords.append(processed_coords[0])

    # 应用偏移量
    return [(x - x_offset, y - y_offset) for x, y in processed_coords]

def read_adr_file(file_path: str) -> List[PinPoint]:
    """从.ADR文件中读取PIN点数据"""
    pin_points = []
    try:
        with open(file_path, "r") as file:
            for line in file:
                parts = line.split()
                if len(parts) >= 6:
                    no = int(parts[0])
                    x = float(parts[2])
                    y = float(parts[4])
                    side = parts[5]
                    pin_points.append(PinPoint(no, x, y, side))
    except FileNotFoundError:
        print(f"Error: ADR file not found at {file_path}")
    return pin_points

def plot_jig(coords_dict: Dict[str, List[Tuple[float, float]]], 
             pin_list: List[PinPoint], 
             title: str, 
             side: str):
    """
    绘制治具轮廓和PIN点
    
    Args:
        coords_dict: 包含不同治具单元坐标的字典
        pin_list: PIN点列表
        title: 图表标题
        side: 要绘制的侧面（'A'或'B'）
    """
    plt.figure(figsize=(10, 10))
    
    # 绘制治具轮廓
    colors = {"up_upper": "red", "up_middle": "blue", "up_bottom": "green",
              "down_upper": "red", "down_middle": "blue", "down_bottom": "green"}
    
    for name, coords in coords_dict.items():
        if coords:  # 确保坐标列表不为空
            x_coords, y_coords = zip(*coords)
            plt.plot(x_coords, y_coords, color=colors.get(name, "black"), label=name)
    
    # 绘制PIN点
    pin_points = [pin for pin in pin_list if pin.side == side]
    if pin_points:
        x_coords = [pin.x for pin in pin_points]
        y_coords = [pin.y for pin in pin_points]
        plt.scatter(x_coords, y_coords, color="black", s=1, label=f"Pin List ({side})")
    
    # 设置图表属性
    plt.title(title)
    plt.xlabel("X Coordinate")
    plt.ylabel("Y Coordinate")
    plt.legend()
    plt.grid()
    plt.axis("equal")
    plt.show()

def main():
    """主处理函数"""
    # 处理所有治具文件
    jig_results = {}
    
    for name, path in FILE_PATHS.items():
        if name == "adr_file":
            continue  # 跳过ADR文件
            
        print(f"Processing {name} jig...")
        
        # 读取偏移量和坐标
        x_offset, y_offset = read_rut_file_for_offset(path)
        coords = extract_coordinates(path)
        
        # 上治具需要X轴镜像
        if name.startswith("up"):
            coords = [(-x, y) for x, y in coords]
        
        # 处理治具单元
        jig_results[name] = process_jig_unit(coords, x_offset, y_offset, name)
    
    # 读取PIN点数据
    pin_list = read_adr_file(FILE_PATHS["adr_file"])
    if pin_list:
        pin_list_a = [pin for pin in pin_list if pin.side == "A"]
        pin_list_b = [pin for pin in pin_list if pin.side == "B"]
        print(f"Pin Points number A: {len(pin_list_a)}")
        print(f"Pin Points number B: {len(pin_list_b)}")
    
    # 绘制上治具
    up_jigs = {k: v for k, v in jig_results.items() if k.startswith("up")}
    plot_jig(up_jigs, pin_list, "Coordinates Plot up Jig", "A")
    
    # 绘制下治具
    down_jigs = {k: v for k, v in jig_results.items() if k.startswith("down")}
    plot_jig(down_jigs, pin_list, "Coordinates Plot down Jig", "B")

if __name__ == "__main__":
    main()