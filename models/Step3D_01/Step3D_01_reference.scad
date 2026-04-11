// Step3D_01_reference.scad
// Легкая параметрическая модель образца Step3D_01 для сайта Step3D.Lab.
// Модель повторяет габариты 120 x 80 x 14 мм и ступенчатую логику образца.
// Используется как публикуемый текстовый 3D-источник внутри репозитория.

$fn = 32;

base_x = 120;
base_y = 80;
base_z = 4;

module rr_cube(size=[10,10,2], r=1.2){
  linear_extrude(height=size[2])
    offset(r=r)
      offset(delta=-r)
        square([size[0], size[1]], center=false);
}

module top_levels(){
  translate([10,10,base_z]) rr_cube([15,30,2]);
  translate([25,10,base_z]) rr_cube([15,40,4]);
  translate([40,10,base_z]) rr_cube([20,50,6]);
  translate([60,20,base_z]) rr_cube([20,40,8]);
  translate([80,30,base_z]) rr_cube([10,20,6]);
  translate([95,25,base_z]) rr_cube([15,20,2]);
  translate([100,30,base_z+2]) rr_cube([10,10,2]);
  translate([30,55,base_z]) rr_cube([10,10,2]);
  translate([40,55,base_z]) rr_cube([10,10,4]);
  translate([50,55,base_z]) rr_cube([10,10,6]);
  translate([60,55,base_z]) rr_cube([10,10,8]);
  translate([70,55,base_z]) rr_cube([10,10,6]);
}

module base_plate(){
  difference(){
    rr_cube([base_x, base_y, base_z], r=1.2);
    translate([0,70,-0.1]) cube([10,10,base_z+0.2]);
    translate([110,35,-0.1]) cube([10,10,base_z+0.2]);
  }
}

union(){
  color("gainsboro") base_plate();
  color("silver") top_levels();
}
