import { Component, NgZone, ViewChild, ElementRef } from '@angular/core';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController, ToastController } from '@ionic/angular';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild('sensor1Canvas') sensor1Canvas: ElementRef;
  @ViewChild('sensor2Canvas') sensor2Canvas: ElementRef;
  @ViewChild('sensor2Graph') sensor2Graph: ElementRef;
  @ViewChild('sensor1Graph') sensor1Graph: ElementRef;
  sensor1Chart: any;
  sensor2Chart: any;
  pairedList: pairedlist;
  listToggle: boolean = false;
  public pairedDeviceID: number = 8;
  dataSend: string = "";
  public connected: Boolean = false;
  public lineChartData1: Array<any> = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  public lineChartData2: Array<any> = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
  public lineChartLabels: Array<any> = ['00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00', '00:00:00'];
  zone: NgZone = new NgZone({ enableLongStackTrace: false });


  constructor(private alertCtrl: AlertController, private bluetoothSerial: BluetoothSerial, private toastCtrl: ToastController) {
    this.checkBluetoothEnabled();
  }

  checkBluetoothEnabled() {
    Chart.defaults.global.legend.display = false;
    this.bluetoothSerial.isEnabled().then(success => {
      this.listPairedDevices();
    }, error => {
      this.showError("Please Enable Bluetooth")
    });
  }

  listPairedDevices() {
    this.bluetoothSerial.list().then(success => {
      this.pairedList = success;
      this.listToggle = true;
    }, error => {
      this.showError("Please Enable Bluetooth")
      this.listToggle = false;
    });
  }

  selectDevice() {
    let connectedDevice = this.pairedList[this.pairedDeviceID];
    if (!connectedDevice.address) {
      this.showError('Select Paired Device to connect');
      return;
    }
    let address = connectedDevice.address;
    let name = connectedDevice.name;
    this.connect(address);
  }

  connect(address) {
    // Attempt to connect device with specified address, call app.deviceConnected if success
    this.bluetoothSerial.connect(address).subscribe(success => {
      this.deviceConnected();
      this.showToast("Successfully Connected");
    }, error => {
      this.showError("Error:Connecting to Device");
      this.connected = false;
      this.sensor1Graph.nativeElement.style.display = "none";
      this.sensor2Graph.nativeElement.style.display = "none";
    });
  }

  deviceConnected() {
    // Subscribe to data receiving as soon as the delimiter is read
    this.bluetoothSerial.subscribe('\n').subscribe(success => {
      this.handleData(success);

      this.zone.run(() => {
        this.connected = true;
        this.sensor1Graph.nativeElement.style.display = "block";
        this.sensor2Graph.nativeElement.style.display = "block";
      });
    }, error => {
      this.showError(error);
    });
  }

  deviceDisconnected() {
    // Unsubscribe from data receiving
    this.bluetoothSerial.disconnect();
    this.showToast("Device Disconnected");
    this.zone.run(() => {
      this.connected = false;
      this.sensor1Graph.nativeElement.style.display = "none";
      this.sensor2Graph.nativeElement.style.display = "none";
    });
  }

  handleData(data) {
    let parsedData = JSON.parse(data);
    let date = new Date();
    let dateString = date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":" + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
    var i;
    this.zone.run(() => {
      for (i = 0; i < 2; i++) {
        let foo = new Reading();
        foo.temperature = parsedData.sensors[i].temperature;
        foo.date = dateString;

        if (i == 0) {
          this.lineChartData1.push(foo.temperature);
          this.lineChartData1.shift();
        } else {
          this.lineChartData2.push(foo.temperature);
          this.lineChartData2.shift();
        }
      }
      this.lineChartLabels.push(dateString);
      this.lineChartLabels.shift();
      this.sensor1Chart = new Chart(this.sensor1Canvas.nativeElement, {

        type: 'line',
        data: {
          labels: this.lineChartLabels,
          datasets: [
            {
              fill: false,
              lineTension: 0.1,
              backgroundColor: "rgba(75,192,192,0.4)",
              borderColor: "rgba(75,192,192,1)",
              borderCapStyle: 'butt',
              borderDash: [],
              borderDashOffset: 0.0,
              borderJoinStyle: 'miter',
              pointBorderColor: "rgba(75,192,192,1)",
              pointBackgroundColor: "#fff",
              pointBorderWidth: 1,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: "rgba(75,192,192,1)",
              pointHoverBorderColor: "rgba(220,220,220,1)",
              pointHoverBorderWidth: 2,
              pointRadius: 1,
              pointHitRadius: 10,
              data: this.lineChartData1,
              spanGaps: false,
            }
          ]
        }

      });
      this.sensor2Chart = new Chart(this.sensor2Canvas.nativeElement, {

        type: 'line',
        data: {
          labels: this.lineChartLabels,
          datasets: [
            {
              fill: false,
              lineTension: 0.1,
              backgroundColor: "rgba(75,192,192,0.4)",
              borderColor: "rgba(75,192,192,1)",
              borderCapStyle: 'butt',
              borderDash: [],
              borderDashOffset: 0.0,
              borderJoinStyle: 'miter',
              pointBorderColor: "rgba(75,192,192,1)",
              pointBackgroundColor: "#fff",
              pointBorderWidth: 1,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: "rgba(75,192,192,1)",
              pointHoverBorderColor: "rgba(220,220,220,1)",
              pointHoverBorderWidth: 2,
              pointRadius: 1,
              pointHitRadius: 10,
              data: this.lineChartData2,
              spanGaps: false,
            }
          ]
        }

      });
    });
  }

  sendData() {
    this.dataSend += '\n';
    this.showToast(this.dataSend);

    this.bluetoothSerial.write(this.dataSend).then(success => {
      this.showToast(success);
    }, error => {
      this.showError(error)
    });
  }

  showError(error) {
    const alert: any = this.alertCtrl.create({
      message: 'Error',
      subHeader: error,
      buttons: ['Dismiss']
    });
    alert.then((_alert: any) => {
      _alert.present();
    })
    this.connected = false;
    this.sensor1Graph.nativeElement.style.display = "none";
    this.sensor2Graph.nativeElement.style.display = "none";
  }

  showToast(msj) {
    const toast = this.toastCtrl.create({
      message: msj,
      duration: 1000
    });

    toast.then((_toast: any) => {
      _toast.present();
    })

  }

  checkValue(event) {
    this.showToast(event.detail.value);
  }
}

interface pairedlist {
  "class": number,
  "id": string,
  "address": string,
  "name": string
}
export class Reading {
  temperature: number;
  date: string;
}

